const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = process.env.SANTIMPAY_BASE_URL || 'https://gateway.santimpay.com/api';
const GATEWAY_MERCHANT_ID = process.env.GATEWAY_MERCHANT_ID || process.env.SANTIMPAY_MERCHANT_ID || 'MERCHANT_ID';

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

