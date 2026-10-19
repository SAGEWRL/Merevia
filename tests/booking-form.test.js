import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppUrl, validateEnquiry } from '../scripts/booking-form.js';

const validEnquiry = {
  enquiryType: 'Travel',
  destination: 'Mombasa',
  partySize: '2',
  arrivalDate: '2027-02-10',
  departureDate: '2027-02-14',
  name: 'Amina',
  contact: 'amina@example.com',
  notes: '',
};

test('accepts a complete enquiry draft without optional notes', () => {
  assert.deepEqual(validateEnquiry(validEnquiry), {});
});

test('requires enquiry details and reports each missing field', () => {
  const errors = validateEnquiry({});

  for (const field of ['enquiryType', 'destination', 'partySize', 'arrivalDate', 'departureDate', 'name', 'contact']) {
    assert.ok(errors[field], `expected an error for ${field}`);
  }
});

test('rejects a departure date on or before arrival', () => {
  const errors = validateEnquiry({ ...validEnquiry, departureDate: validEnquiry.arrivalDate });

  assert.equal(errors.departureDate, 'Departure must be after arrival.');
});

test('rejects invalid party sizes and enquiry categories', () => {
  const errors = validateEnquiry({ ...validEnquiry, partySize: '1.5', enquiryType: 'Anything' });

  assert.equal(errors.partySize, 'Enter a whole number greater than zero.');
  assert.equal(errors.enquiryType, 'Choose one of the listed services.');
});

test('rejects whitespace-only required values', () => {
  const errors = validateEnquiry({ ...validEnquiry, name: '   ', contact: '  ' });

  assert.equal(errors.name, 'Enter your name.');
  assert.equal(errors.contact, 'Enter a preferred contact detail.');
});

test('builds a WhatsApp enquiry link using the Kenyan international number', () => {
  const url = new URL(buildWhatsAppUrl(validEnquiry, '0714 237 082'));

  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/254714237082');
  assert.match(url.searchParams.get('text'), /Service: Travel/);
  assert.match(url.searchParams.get('text'), /Travel dates: 2027-02-10 to 2027-02-14/);
});