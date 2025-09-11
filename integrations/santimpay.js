const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = process.env.SANTIMPAY_BASE_URL || 'https://gateway.santimpay.com/api';
const GATEWAY_MERCHANT_ID = process.env.GATEWAY_MERCHANT_ID || process.env.SANTIMPAY_MERCHANT_ID || 'MERCHANT_ID';

function normalizePemString(maybePem) {
  if (!maybePem) return '';
  let key = String(maybePem).trim();
  // Handle envs where newlines are escaped ("\\n")
  if (key.includes('\\n') && !key.includes('\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  // If it's base64 without headers, wrap as PKCS8
  const looksLikeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(key) && !key.includes('BEGIN');
  if (looksLikeBase64) {
    const body = key.replace(/\s+/g, '');
    const chunks = body.match(/.{1,64}/g) || [body];
    return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }
  return key;
}

function importPrivateKey(pem) {
  const normalized = normalizePemString(pem);
  // Try PKCS8 first (-----BEGIN PRIVATE KEY-----), then SEC1 EC (-----BEGIN EC PRIVATE KEY-----)
  const candidates = [
    { type: 'pkcs8', format: 'pem' },
    { type: 'sec1', format: 'pem' }
  ];
  let lastError;
  for (const opts of candidates) {
    try {
      return crypto.createPrivateKey({ key: normalized, format: opts.format, type: opts.type });
    } catch (err) {
      lastError = err;
    }
  }
  const help = 'Ensure the private key is an EC P-256 key in PKCS8 (BEGIN PRIVATE KEY) or SEC1 (BEGIN EC PRIVATE KEY) PEM format. If stored in an env var, include literal newlines or use \\n and we will normalize.';
  const error = new Error(`Failed to import private key. ${help}`);
  error.cause = lastError;
  throw error;
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
  const token = signES256(payload, process.env.PRIVATE_KEY_IN_PEM);
  return token;
}

async function DirectPayment(id, amount, paymentReason, notifyUrl, phoneNumber, paymentMethod) {
  const token = await generateSignedTokenForDirectPayment(amount, paymentReason, paymentMethod, phoneNumber);
  const payload = {
    ID: id,
    Amount: amount,
    Reason: paymentReason,
    MerchantID: GATEWAY_MERCHANT_ID,
    SignedToken: token,
    PhoneNumber: phoneNumber,
    NotifyURL: notifyUrl,
    PaymentMethod: paymentMethod
  };
  const url = `${BASE_URL}/direct-payment`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SantimPay direct-payment failed: ${res.status} ${t}`);
  }
  const body = await res.json();
  return body;
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
    NotifyURL: notifyUrl,
    PaymentMethod: paymentMethod
  };
  const url = `${BASE_URL}/payout-b2c`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SantimPay payout-b2c failed: ${res.status} ${t}`);
  }
  const body = await res.json();
  return body;
}

module.exports = { generateSignedTokenForDirectPayment, DirectPayment, PayoutB2C };

