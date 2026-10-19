const API_HOSTS = Object.freeze({
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
});

export function normalizeKenyanPhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `254${digits.slice(1)}`;
  else if (digits.startsWith('7') || digits.startsWith('1')) digits = `254${digits}`;
  if (!/^254[17]\d{8}$/.test(digits)) throw new Error('Enter a valid Kenyan mobile number for M-Pesa.');
  return digits;
}

export function darajaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

function mpesaPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

async function readProviderResponse(response) {
  let body;
  try { body = await response.json(); } catch { throw new Error('M-Pesa returned an unreadable response.'); }
  if (!response.ok) {
    throw new Error(`M-Pesa request failed with HTTP ${response.status}.`);
  }
  return body;
}

export function createMpesaClient({ environment = process.env, fetchImpl = fetch, now = () => new Date() } = {}) {
  const selectedEnvironment = environment.MPESA_ENV || 'sandbox';
  if (!Object.hasOwn(API_HOSTS, selectedEnvironment)) throw new Error('MPESA_ENV must be sandbox or production.');
  const baseUrl = API_HOSTS[selectedEnvironment];

  function configurationError() {
    const missing = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL', 'MPESA_CALLBACK_TOKEN']
      .filter((key) => !environment[key]);
    if (missing.length) return `M-Pesa configuration is incomplete (${missing.join(', ')}).`;
    try {
      const callback = new URL(environment.MPESA_CALLBACK_URL);
      if (selectedEnvironment === 'production' && callback.protocol !== 'https:') return 'Production M-Pesa callbacks must use HTTPS.';
      if (!['http:', 'https:'].includes(callback.protocol) || callback.username || callback.password) return 'MPESA_CALLBACK_URL must be a valid HTTP(S) callback URL.';
    } catch { return 'MPESA_CALLBACK_URL must be a valid HTTP(S) callback URL.'; }
    if (environment.MPESA_CALLBACK_TOKEN.length < 32) return 'MPESA_CALLBACK_TOKEN must contain at least 32 characters.';
    if (!/^\d{5,7}$/.test(environment.MPESA_SHORTCODE)) return 'MPESA_SHORTCODE must be a valid numeric shortcode.';
    if (environment.MPESA_TRANSACTION_TYPE && !['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'].includes(environment.MPESA_TRANSACTION_TYPE)) {
      return 'MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.';
    }
    return '';
  }

  async function accessToken() {
    const error = configurationError();
    if (error) throw new Error(error);
    const authorization = Buffer.from(`${environment.MPESA_CONSUMER_KEY}:${environment.MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await fetchImpl(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authorization}` },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await readProviderResponse(response);
    if (typeof body.access_token !== 'string' || !body.access_token) throw new Error('M-Pesa did not return an access token.');
    return body.access_token;
  }

  async function initiateStkPush({ phoneNumber, amountKes, accountReference, description }) {
    const error = configurationError();
    if (error) throw new Error(error);
    if (!Number.isSafeInteger(amountKes) || amountKes < 1) throw new Error('M-Pesa amount must be a positive whole number of Kenyan shillings.');
    const phone = normalizeKenyanPhone(phoneNumber);
    const timestamp = darajaTimestamp(now());
    const token = await accessToken();
    const callbackUrl = new URL(environment.MPESA_CALLBACK_URL);
    callbackUrl.searchParams.set('token', environment.MPESA_CALLBACK_TOKEN);
    const payload = {
      BusinessShortCode: environment.MPESA_SHORTCODE,
      Password: mpesaPassword(environment.MPESA_SHORTCODE, environment.MPESA_PASSKEY, timestamp),
      Timestamp: timestamp,
      TransactionType: environment.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: amountKes,
      PartyA: phone,
      PartyB: environment.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: callbackUrl.toString(),
      AccountReference: String(accountReference).slice(0, 12),
      TransactionDesc: String(description || 'Accommodation booking').slice(0, 13),
    };
    const response = await fetchImpl(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await readProviderResponse(response);
    if (result.ResponseCode !== '0' || !result.CheckoutRequestID || !result.MerchantRequestID) {
      throw new Error(result.ResponseDescription || result.errorMessage || 'M-Pesa did not accept the payment request.');
    }
    return {
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      customerMessage: result.CustomerMessage || 'Check your phone for the M-Pesa payment prompt.',
    };
  }

  async function queryStkPush(checkoutRequestId) {
    const error = configurationError();
    if (error) throw new Error(error);
    const timestamp = darajaTimestamp(now());
    const token = await accessToken();
    const response = await fetchImpl(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: environment.MPESA_SHORTCODE,
        Password: mpesaPassword(environment.MPESA_SHORTCODE, environment.MPESA_PASSKEY, timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return readProviderResponse(response);
  }

  return Object.freeze({
    configured: !configurationError(),
    configurationError,
    initiateStkPush,
    queryStkPush,
  });
}