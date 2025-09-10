const axios = require('axios');

function buildUrlFromTemplate(template, params) {
  if (!template) return null;
  return Object.keys(params || {}).reduce((acc, key) => acc.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(String(params[key]))), template);
}

async function safeData(promise) {
  try {
    const { data } = await promise;
    return data;
  } catch (_) { return null; }
}

function pickDeep(obj, pathsCsv) {
  if (!obj || !pathsCsv) return undefined;
  const paths = String(pathsCsv).split(',').map(s => s.trim()).filter(Boolean);
  for (const p of paths) {
    const val = p.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
    if (val != null && val !== '') return val;
  }
  return undefined;
}

async function getPassengerById(passengerId) {
  try {
    const template = process.env.PASSENGER_LOOKUP_URL_TEMPLATE;
    if (!template || !passengerId) return null;
    const url = buildUrlFromTemplate(template, { id: passengerId });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const data = await safeData(axios.get(url, { headers }));
    if (!data) return null;
    const candidate = data.data || data.user || data.passenger || data.account || data;
    const nameFromEnv = pickDeep(candidate, process.env.PASSENGER_NAME_PATHS);
    const phoneFromEnv = pickDeep(candidate, process.env.PASSENGER_PHONE_PATHS);
    const name = nameFromEnv || candidate.name || candidate.fullName || candidate.fullname || (candidate.profile && candidate.profile.name) || undefined;
    const phone = phoneFromEnv || candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || (candidate.contact && candidate.contact.phone) || (candidate.profile && candidate.profile.phone) || undefined;
    return { id: String(passengerId), name, phone };
  } catch (_) { return null; }
}

async function getDriverById(driverId) {
  try {
    const template = process.env.DRIVER_LOOKUP_URL_TEMPLATE;
    if (!template || !driverId) return null;
    const url = buildUrlFromTemplate(template, { id: driverId });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const data = await safeData(axios.get(url, { headers }));
    if (!data) return null;
    const candidate = data.data || data.user || data.driver || data.account || data;
    const name = candidate.name || candidate.fullName || candidate.fullname || (candidate.profile && candidate.profile.name) || undefined;
    const phone = candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || (candidate.contact && candidate.contact.phone) || (candidate.profile && candidate.profile.phone) || undefined;
    return { id: String(driverId), name, phone };
  } catch (_) { return null; }
}

async function listPassengers(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/passengers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const data = await safeData(axios.get(url.toString(), { headers }));
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

async function listDrivers(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/drivers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const data = await safeData(axios.get(url.toString(), { headers }));
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

module.exports = { getPassengerById, getDriverById, listPassengers, listDrivers };

