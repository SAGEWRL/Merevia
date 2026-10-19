import assert from 'node:assert/strict';
import test from 'node:test';
import { createMpesaClient, darajaTimestamp, normalizeKenyanPhone } from '../scripts/mpesa.js';

const environment = {
  MPESA_ENV: 'sandbox',
  MPESA_CONSUMER_KEY: 'test-consumer-key',
  MPESA_CONSUMER_SECRET: 'test-consumer-secret',
  MPESA_SHORTCODE: '174379',
  MPESA_PASSKEY: 'test-passkey',
  MPESA_CALLBACK_URL: 'https://example.test/api/payments/mpesa/callback',
  MPESA_CALLBACK_TOKEN: 'test-callback-token-with-more-than-32-characters',
};

test('normalizes Kenyan mobile numbers and rejects invalid input', () => {
  assert.equal(normalizeKenyanPhone('0714 237 082'), '254714237082');
  assert.equal(normalizeKenyanPhone('+254 735 109 066'), '254735109066');
  assert.throws(() => normalizeKenyanPhone('12345'), /valid Kenyan mobile/);
});

test('Daraja timestamps use the expected local format', () => {
  assert.equal(darajaTimestamp(new Date('2026-10-19T09:08:07Z')), '20261019120807');
});

test('sandbox STK requests use server credentials, confirmed amount, and protected callback URL', async () => {
  const calls = [];
  const responses = [
    { access_token: 'mock-access-token', expires_in: '3599' },
    {
      ResponseCode: '0',
      CheckoutRequestID: 'ws_CO_MOCK_1',
      MerchantRequestID: 'mock-merchant-1',
      CustomerMessage: 'Check your phone.',
    },
    { access_token: 'mock-query-token', expires_in: '3599' },
    { ResponseCode: '0', ResultCode: '0', ResultDesc: 'Processed' },
  ];
  const client = createMpesaClient({
    environment,
    now: () => new Date('2026-10-19T09:08:07Z'),
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify(responses[calls.length - 1]), { status: 200 });
    },
  });

  assert.equal(client.configured, true);
  const initiated = await client.initiateStkPush({
    phoneNumber: '0714 237 082',
    amountKes: 5000,
    accountReference: 'BJL-TEST-1234567890',
    description: 'Confirmed room booking',
  });
  assert.deepEqual(initiated, {
    checkoutRequestId: 'ws_CO_MOCK_1',
    merchantRequestId: 'mock-merchant-1',
    customerMessage: 'Check your phone.',
  });
  const oauth = calls[0];
  assert.match(oauth.url, /^https:\/\/sandbox\.safaricom\.co\.ke\/oauth\/v1\/generate/);
  assert.match(oauth.options.headers.Authorization, /^Basic /);

  const stk = calls[1];
  assert.match(stk.url, /^https:\/\/sandbox\.safaricom\.co\.ke\/mpesa\/stkpush\/v1\/processrequest$/);
  const payload = JSON.parse(stk.options.body);
  assert.equal(payload.Amount, 5000);
  assert.equal(payload.PhoneNumber, '254714237082');
  assert.equal(payload.Timestamp, '20261019120807');
  assert.equal(new URL(payload.CallBackURL).searchParams.get('token'), environment.MPESA_CALLBACK_TOKEN);
  const queried = await client.queryStkPush('ws_CO_MOCK_1');
  assert.equal(queried.ResultCode, '0');
  assert.match(calls[3].url, /stkpushquery\/v1\/query$/);
  assert.equal(JSON.parse(calls[3].options.body).CheckoutRequestID, 'ws_CO_MOCK_1');
});

test('production M-Pesa requires an HTTPS callback URL', () => {
  const client = createMpesaClient({ environment: { ...environment, MPESA_ENV: 'production', MPESA_CALLBACK_URL: 'http://example.test/callback' } });
  assert.equal(client.configured, false);
  assert.match(client.configurationError(), /must use HTTPS/);
});