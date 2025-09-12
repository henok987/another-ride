const crypto = require('crypto');
const axios = require('axios');
const { PRIVATE_KEY } = require('./keys');
require('dotenv').config();

const BASE_URL = process.env.SANTIMPAY_BASE_URL || 'https://services.santimpay.com/api/v1/gateway';
const GATEWAY_MERCHANT_ID = process.env.GATEWAY_MERCHANT_ID || process.env.SANTIMPAY_MERCHANT_ID || 'MERCHANT_ID';

function loadPrivateKeyPem() {
  let raw = PRIVATE_KEY || process.env.PRIVATE_KEY_IN_PEM || process.env.SANTIMPAY_PRIVATE_KEY || '';
  if (!raw) return null;
  // Replace escaped newlines ("\n") with real newlines, and normalize CRLF
  let pem = raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  // If no PEM header, assume base64 payload and wrap as PKCS#8
  if (!/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(pem)) {
    // Remove spaces and newlines, then wrap
    const base64 = pem.replace(/\s+/g, '');
    const wrapped = base64.match(/.{1,64}/g)?.join('\n') || base64;
    pem = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
  }
  return pem;
}

function importPrivateKey(pem) {
  return crypto.createPrivateKey({ key: pem, format: 'pem' });
}

function signES256(payload, privateKeyPem) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const sign = crypto.createSign('SHA256');
  sign.update(unsigned);
  sign.end();
  const key = importPrivateKey(privateKeyPem);
  const signature = sign.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function generateSignedTokenForDirectPayment(amount, paymentReason, paymentMethod, phoneNumber) {
  const time = Math.floor(Date.now() / 1000);
  const payload = {
    amount,
    paymentReason,
    paymentMethod,
    phoneNumber,
    merchantId: GATEWAY_MERCHANT_ID,
    generated: time
  };
  const pem = loadPrivateKeyPem();
  if (!pem) {
    throw new Error('SantimPay signing key not configured. Provide PRIVATE_KEY_IN_PEM or SANTIMPAY_PRIVATE_KEY or SANTIMPAY_PRIVATE_KEY_PATH');
  }
  let token;
  try {
    token = signES256(payload, pem);
  } catch (e) {
    // Surface clearer error for PEM decode problems
    throw new Error(`Failed to sign ES256 token: ${e.message}. Ensure the private key is a valid EC P-256 key in PEM format.`);
  }
  return token;
}

async function DirectPayment(arg1, amount, paymentReason, notifyUrl, phoneNumber, paymentMethod) {
  let params;
  if (typeof arg1 === 'object' && arg1 !== null) {
    params = {
      Id: arg1.Id || arg1.ID,
      Amount: arg1.Amount,
      PaymentReason: arg1.PaymentReason || arg1.Reason,
      PhoneNumber: arg1.PhoneNumber,
      PaymentMethod: arg1.PaymentMethod,
      NotifyUrl: arg1.NotifyUrl || arg1.NotifyURL
    };
  } else {
    params = {
      Id: arg1,
      Amount: amount,
      PaymentReason: paymentReason,
      PhoneNumber: phoneNumber,
      PaymentMethod: paymentMethod,
      NotifyUrl: notifyUrl
    };
  }

  const missing = [];
  if (!params.PhoneNumber) missing.push('PhoneNumber');
  if (!params.Id) missing.push('Id');
  if (!params.PaymentReason) missing.push('PaymentReason');
  if (!params.NotifyUrl) missing.push('NotifyUrl');
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  const pmRaw = (params.PaymentMethod || 'santimpay').toLowerCase();
  const pm = normalizePaymentMethod(pmRaw) || pmRaw;
  const token = await generateSignedTokenForDirectPayment(params.Amount, params.PaymentReason, pm, params.PhoneNumber);

  const payload = {
    // Provide both canonical and legacy aliases to satisfy varying API validators
    Id: params.Id,
    ID: params.Id,
    Amount: params.Amount,
    PaymentReason: params.PaymentReason,
    Reason: params.PaymentReason,
    MerchantId: GATEWAY_MERCHANT_ID,
    MerchantID: GATEWAY_MERCHANT_ID,
    SignedToken: token,
    PhoneNumber: params.PhoneNumber,
    Msisdn: params.PhoneNumber,
    NotifyUrl: params.NotifyUrl,
    NotifyURL: params.NotifyUrl,
    PaymentMethod: pm
  };
  const url = `${BASE_URL}/direct-payment`;
  const headers = { 'Content-Type': 'application/json' };
  return await requestWithRetry('direct-payment', url, payload, headers);
}

async function PayoutB2C(id, amount, destination, notifyUrl, paymentMethod = 'santimpay') {
  // Assuming similar signing requirements; adjust when official docs are available
  const token = await generateSignedTokenForDirectPayment(amount, 'Wallet Payout', paymentMethod, destination);
  const payload = {
    ID: id,
    Amount: amount,
    Destination: destination,
    MerchantID: GATEWAY_MERCHANT_ID,
    SignedToken: token,
    NotifyURL: notifyUrl
  };
  const pm = normalizePaymentMethod(paymentMethod);
  if (pm) payload.PaymentMethod = pm;
  const url = `${BASE_URL}/payout-b2c`;
  const headers = { 'Content-Type': 'application/json' };
  return await requestWithRetry('payout-b2c', url, payload, headers);
}

module.exports = { generateSignedTokenForDirectPayment, DirectPayment, PayoutB2C };

function isTransientNetworkError(err) {
  const code = err && (err.code || (err.cause && err.cause.code));
  if (code && ['EAI_AGAIN','ENOTFOUND','ECONNRESET','ETIMEDOUT','ECONNABORTED','EHOSTUNREACH','EPIPE','EADDRINUSE'].includes(code)) return true;
  const status = err && err.response && err.response.status;
  return status && [502,503,504].includes(status);
}

async function requestWithRetry(opName, url, payload, headers, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const { data } = await axios.post(url, payload, { headers, timeout: 15000 });
      return data;
    } catch (err) {
      lastErr = err;
      if (!isTransientNetworkError(err) || i === attempts - 1) {
        const status = err.response && err.response.status;
        const text = err.response && (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
        const code = err.code;
        throw new Error(`SantimPay ${opName} failed: ${status || code || 'ERR'} ${text || err.message}`);
      }
      const delay = baseDelayMs * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr || new Error(`SantimPay ${opName} failed: unknown error`);
}

function normalizePaymentMethod(method) {
  if (!method) return undefined;
  const s = String(method).toLowerCase().trim();
  const map = {
    telebirr: 'TeleBirr',
    tele_birr: 'TeleBirr',
    tb: 'TeleBirr',
    cbe: 'CBE',
    card: 'Card',
    wallet: 'Wallet'
  };
  return map[s];
}

