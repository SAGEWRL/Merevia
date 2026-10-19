import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { createApiHandler } from '../scripts/api.js';
import { createDatabase } from '../scripts/database.js';

const database = createDatabase(':memory:');
const adminPassword = 'Payment-test-admin-password-940!';
const callbackToken = 'testing-only-callback-token-0123456789';
let initiationCount = 0;
let initiatedAmount = 0;
const mpesaClient = {
  configured: true,
  async initiateStkPush(request) {
    initiationCount += 1;
    initiatedAmount = request.amountKes;
    return {
      checkoutRequestId: 'ws_CO_TEST_123456789',
      merchantRequestId: 'test-merchant-123',
      customerMessage: 'Check your phone.',
    };
  },
  async queryStkPush(checkoutRequestId) {
    assert.equal(checkoutRequestId, 'ws_CO_TEST_123456789');
    return { ResultCode: '0', ResultDesc: 'The service request is processed successfully.' };
  },
};
const environment = { ADMIN_PASSWORD: adminPassword, BOOKING_ACCESS_SECRET: 'a'.repeat(40), MPESA_CALLBACK_TOKEN: callbackToken };
const api = createApiHandler({ database, environment, mpesaClient });
const server = createServer((request, response) => {
  void api(request, response, new URL(request.url, `http://${request.headers.host}`));
});
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  database.close();
});

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, result: response.status === 204 ? {} : await response.json() };
}

test('only a confirmed booking total can start M-Pesa and only provider reconciliation marks it paid', async () => {
  initiationCount = 0;
  const { response: createResponse, result: created } = await request('/api/bookings', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'payment-flow-booking-001' },
    body: {
      location: 'Mombasa',
      accommodationType: 'Single room',
      checkIn: '2027-06-01',
      checkOut: '2027-06-03',
      guests: 1,
      customerName: 'Payment Test Guest',
      customerPhone: '+254700000009',
    },
  });
  assert.equal(createResponse.status, 201);
  const customerCookie = createResponse.headers.get('set-cookie').split(';')[0];
  const paymentBody = { bookingReference: created.booking.reference, customerPhone: '+254700000009' };
  const headers = { Origin: baseUrl, Cookie: customerCookie, 'Idempotency-Key': 'payment-flow-attempt-001' };

  const notConfirmed = await request('/api/payments/mpesa', { method: 'POST', headers, body: paymentBody });
  assert.equal(notConfirmed.response.status, 409);
  assert.equal(notConfirmed.result.error.code, 'booking_not_confirmed');
  assert.equal(initiationCount, 0);

  const login = await request('/api/admin/login', {
    method: 'POST', headers: { Origin: baseUrl }, body: { password: adminPassword },
  });
  assert.equal(login.response.status, 200);
  const adminCookie = login.response.headers.get('set-cookie').split(';')[0];
  const propertyResponse = await request('/api/admin/properties', {
    method: 'POST',
    headers: { Cookie: adminCookie, Origin: baseUrl },
    body: {
      name: 'Payment test property',
      location: 'Mombasa',
      accommodationType: 'Single room',
      dailyPriceKes: 2500,
      guestCapacity: 2,
      availabilityStatus: 'available',
      priceConfirmed: true,
      published: true,
    },
  });
  const property = propertyResponse.result.property;
  const confirmed = await request(`/api/admin/bookings/${created.booking.id}`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie, Origin: baseUrl },
    body: { status: 'confirmed', propertyId: property.id, confirmedAmountKes: 5000 },
  });
  assert.equal(confirmed.response.status, 200);

  const noPrivateCookie = await request('/api/payments/mpesa', {
    method: 'POST', headers: { Origin: baseUrl, 'Idempotency-Key': 'payment-flow-no-cookie' }, body: paymentBody,
  });
  assert.equal(noPrivateCookie.response.status, 404);
  assert.equal(initiationCount, 0);

  const started = await request('/api/payments/mpesa', { method: 'POST', headers, body: paymentBody });
  assert.equal(started.response.status, 202);
  assert.equal(started.result.payment.status, 'pending');
  assert.equal(started.result.payment.amountKes, 5000);
  assert.equal(initiatedAmount, 5000);
  assert.equal(initiationCount, 1);

  const duplicate = await request('/api/payments/mpesa', { method: 'POST', headers, body: paymentBody });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.result.duplicate, true);
  assert.equal(initiationCount, 1);

  const callbackBody = {
    Body: {
      stkCallback: {
        CheckoutRequestID: 'ws_CO_TEST_123456789',
        ResultCode: 0,
        CallbackMetadata: { Item: [
          { Name: 'Amount', Value: 5000 },
          { Name: 'MpesaReceiptNumber', Value: 'QAB12CD34E' },
          { Name: 'PhoneNumber', Value: 254700000009 },
        ] },
      },
    },
  };
  const rejectedCallback = await request('/api/payments/mpesa/callback?token=wrong-token', { method: 'POST', body: callbackBody });
  assert.equal(rejectedCallback.response.status, 401);
  const callback = await request(`/api/payments/mpesa/callback?token=${callbackToken}`, { method: 'POST', body: callbackBody });
  assert.equal(callback.response.status, 200);

  const status = await request(`/api/bookings/${created.booking.reference}`, { headers: { Cookie: customerCookie } });
  assert.equal(status.response.status, 200);
  assert.equal(status.result.payments[0].status, 'succeeded');
  assert.equal(database.prepare('SELECT count(*) AS count FROM payment_attempts').get().count, 1);
});