const fs = require('fs');
const path = require('path');

let PRIVATE_KEY = '';
let PUBLIC_KEY = '';

// Prefer explicit PEM vars first (supports multi-line values)
if (process.env.PRIVATE_KEY_IN_PEM) {
  PRIVATE_KEY = String(process.env.PRIVATE_KEY_IN_PEM).replace(/\\n/g, '\n');
}
if (process.env.PUBLIC_KEY_IN_PEM) {
  PUBLIC_KEY = String(process.env.PUBLIC_KEY_IN_PEM).replace(/\\n/g, '\n');
}

// Backward-compat: generic variable names
if (!PRIVATE_KEY && process.env.SANTIMPAY_PRIVATE_KEY) {
  PRIVATE_KEY = String(process.env.SANTIMPAY_PRIVATE_KEY).replace(/\\n/g, '\n');
}
if (!PUBLIC_KEY && process.env.SANTIMPAY_PUBLIC_KEY) {
  PUBLIC_KEY = String(process.env.SANTIMPAY_PUBLIC_KEY).replace(/\\n/g, '\n');
}

if (!PRIVATE_KEY && process.env.PRIVATE_KEY) {
  PRIVATE_KEY = String(process.env.PRIVATE_KEY).replace(/\\n/g, '\n');
}
if (!PUBLIC_KEY && process.env.PUBLIC_KEY) {
  PUBLIC_KEY = String(process.env.PUBLIC_KEY).replace(/\\n/g, '\n');
}

// Fallback to file paths
if (!PRIVATE_KEY && process.env.SANTIMPAY_PRIVATE_KEY_PATH) {
  try { PRIVATE_KEY = fs.readFileSync(path.resolve(process.env.SANTIMPAY_PRIVATE_KEY_PATH), 'utf8'); } catch (_) {}
}
if (!PUBLIC_KEY && process.env.SANTIMPAY_PUBLIC_KEY_PATH) {
  try { PUBLIC_KEY = fs.readFileSync(path.resolve(process.env.SANTIMPAY_PUBLIC_KEY_PATH), 'utf8'); } catch (_) {}
}

if (!PRIVATE_KEY && process.env.PRIVATE_KEY_PATH) {
  try { PRIVATE_KEY = fs.readFileSync(path.resolve(process.env.PRIVATE_KEY_PATH), 'utf8'); } catch (_) {}
}
if (!PUBLIC_KEY && process.env.PUBLIC_KEY_PATH) {
  try { PUBLIC_KEY = fs.readFileSync(path.resolve(process.env.PUBLIC_KEY_PATH), 'utf8'); } catch (_) {}
}

// Sanitize: trim and strip surrounding quotes if present
const stripWrappingQuotes = (s) => {
  if (!s) return s;
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

PRIVATE_KEY = stripWrappingQuotes(PRIVATE_KEY).replace(/\r\n/g, '\n');
PUBLIC_KEY = stripWrappingQuotes(PUBLIC_KEY).replace(/\r\n/g, '\n');

module.exports = { PRIVATE_KEY, PUBLIC_KEY };

