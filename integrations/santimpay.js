const crypto = require('crypto');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.SANTIMPAY_BASE_URL || 'https://gateway.santimpay.com/api';
const GATEWAY_MERCHANT_ID = process.env.GATEWAY_MERCHANT_ID || process.env.SANTIMPAY_MERCHANT_ID || 'MERCHANT_ID';

function normalizePemString(maybePem) {
  if (!maybePem) return '';
  let key = String(maybePem).trim();
  // Strip wrapping quotes if present
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  // Handle envs where newlines are escaped ("\\n")
  if (key.includes('\\n') && !key.includes('\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  // Normalize CRLF to LF
  key = key.replace(/\r\n/g, '\n');
  // Ensure trailing newline for PEM parser friendliness
  if (!key.endsWith('\n')) key += '\n';
  // If it's base64 without headers, wrap as PKCS8
  const looksLikeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(key) && !key.includes('BEGIN');
  if (looksLikeBase64) {
    const body = key.replace(/\s+/g, '');
    const chunks = body.match(/.{1,64}/g) || [body];
    return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }
  return key;
}

function readTextIfPath(maybePath) {
  if (!maybePath) return null;
  const candidate = String(maybePath).trim();
  // If it looks like an absolute or relative path and exists, read it
  const looksLikePath = candidate.endsWith('.pem') || candidate.includes('/') || candidate.includes('\\');
  if (looksLikePath) {
    const resolved = path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, 'utf8');
    }
  }
  return null;
}

function importPrivateKey(pem, options = {}) {
  const normalized = normalizePemString(pem);
  // Support JWK in env (stringified JSON)
  const trimmed = String(pem || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const jwk = JSON.parse(trimmed);
      return crypto.createPrivateKey({ key: jwk, format: 'jwk' });
    } catch (err) {
      // fallthrough to PEM attempts below
    }
  }
  // Try Node auto-detection first
  let lastError;
  try {
    return crypto.createPrivateKey({ key: normalized, format: 'pem', passphrase: options.passphrase });
  } catch (err) {
    lastError = err;
  }
  // Try explicit types
  const candidates = [
    { type: 'pkcs8', format: 'pem' },
    { type: 'sec1', format: 'pem' }
  ];
  for (const opts of candidates) {
    try {
      return crypto.createPrivateKey({ key: normalized, format: opts.format, type: opts.type, passphrase: options.passphrase });
    } catch (err) {
      lastError = err;
    }
  }
  // Provide actionable diagnostics
  if (/BEGIN RSA PRIVATE KEY/.test(normalized)) {
    throw new Error('Failed to import private key: RSA key provided. ES256 requires an EC P-256 key.');
  }
  const help = 'Ensure the private key is an EC P-256 key in PKCS8 (BEGIN PRIVATE KEY) or SEC1 (BEGIN EC PRIVATE KEY) PEM format, or a JWK with kty=EC, crv=P-256. If stored in an env var, include literal newlines or use \\n.';
  const detail = lastError && lastError.message ? ` Cause: ${lastError.message}` : '';
  const error = new Error(`Failed to import private key. ${help}${detail}`);
  error.cause = lastError;
  throw error;
}

function ensureEcP256PrivateKey(keyObject) {
  try {
    if (keyObject.asymmetricKeyType !== 'ec') {
      throw new Error(`Invalid key type: ${keyObject.asymmetricKeyType}. ES256 requires EC.`);
    }
    const details = keyObject.asymmetricKeyDetails || {};
    const curve = details.namedCurve || details.name;
    if (curve && curve !== 'prime256v1' && curve !== 'P-256' && curve !== 'secp256r1') {
      throw new Error(`Invalid EC curve: ${curve}. ES256 requires P-256 (prime256v1/secp256r1).`);
    }
  } catch (e) {
    const error = new Error(`Failed to import private key. ${e.message}`);
    error.cause = e;
    throw error;
  }
}

function signES256(payload, privateKeyPem) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const sign = crypto.createSign('SHA256');
  sign.update(unsigned);
  sign.end();
  const key = importPrivateKey(privateKeyPem, { passphrase: process.env.PRIVATE_KEY_PASSPHRASE });
  ensureEcP256PrivateKey(key);
  const signature = sign.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
}

function getPrivateKeyMaterial() {
  // Priority: explicit file env -> env content -> env path-like -> error
  const fileFromEnv = process.env.PRIVATE_KEY_FILE || process.env.PRIVATE_KEY_PATH;
  const fromExplicitFile = readTextIfPath(fileFromEnv);
  if (fromExplicitFile) return fromExplicitFile;

  const inline = process.env.PRIVATE_KEY_IN_PEM || process.env.PRIVATE_KEY || '';
  if (inline) {
    const fromInlinePath = readTextIfPath(inline);
    return fromInlinePath || inline;
  }
  throw new Error('Missing PRIVATE_KEY_IN_PEM or PRIVATE_KEY_FILE');
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
  const privateKeyMaterial = getPrivateKeyMaterial();
  const token = signES256(payload, privateKeyMaterial);
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

