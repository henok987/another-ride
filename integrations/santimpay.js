const crypto = require('crypto');
const axios = require('axios');
const { PRIVATE_KEY } = require('./keys');
require('dotenv').config();

const BASE_URL = process.env.SANTIMPAY_BASE_URL || 'https://gateway.santimpay.com/api';
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
  try {
    const { data } = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
    return data;
  } catch (err) {
    const status = err.response && err.response.status;
    const text = err.response && (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
    throw new Error(`SantimPay direct-payment failed: ${status || 'ERR'} ${text || err.message}`);
  }
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
  try {
    const { data } = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
    return data;
  } catch (err) {
    const status = err.response && err.response.status;
    const text = err.response && (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
    throw new Error(`SantimPay payout-b2c failed: ${status || 'ERR'} ${text || err.message}`);
  }
}

module.exports = { generateSignedTokenForDirectPayment, DirectPayment, PayoutB2C };

