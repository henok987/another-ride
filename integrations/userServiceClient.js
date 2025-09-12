const axios = require('axios');

function buildUrlFromTemplate(template, params) {
  if (!template) return null;
  return Object.keys(params || {}).reduce((acc, key) => acc.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(String(params[key]))), template);
}

async function safeJson(res) { return res && res.data ? res.data : null; }

function extractUserCandidate(data) {
  return data?.data || data?.user || data?.account || data?.driver || data?.passenger || data || {};
}

function pickCommonName(candidate) {
  return candidate.name || candidate.fullName || candidate.fullname || candidate.displayName || candidate.profile?.name;
}

function pickCommonPhone(candidate) {
  return candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || candidate.contact?.phone || candidate.profile?.phone;
}

function pickCommonEmail(candidate) {
  return candidate.email || candidate.contact?.email || candidate.profile?.email;
}

function authHeadersFromOptions(options) {
  const headers = { 'Accept': 'application/json' };
  const authHeader = options && options.headers && options.headers.Authorization ? options.headers.Authorization : undefined;
  if (authHeader) headers['Authorization'] = authHeader;
  else if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
  return headers;
}

async function getPassengerById(passengerId, options = undefined) {
  try {
    const template = process.env.PASSENGER_LOOKUP_URL_TEMPLATE;
    if (!template || !passengerId) return null;
    const url = buildUrlFromTemplate(template, { id: passengerId });
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url, { headers }).catch(() => null);
    if (!res) return null;
    const data = await safeJson(res);
    const c = extractUserCandidate(data);
    return { id: String(passengerId), name: pickCommonName(c), phone: pickCommonPhone(c), email: pickCommonEmail(c) };
  } catch (_) { return null; }
}

async function getDriverById(driverId, options = undefined) {
  try {
    let template = process.env.DRIVER_LOOKUP_URL_TEMPLATE;
    if (!template && process.env.AUTH_BASE_URL) {
      const base = process.env.AUTH_BASE_URL.replace(/\/$/, '');
      template = `${base}/drivers/{id}`;
    }
    if (!template || !driverId) return null;
    const url = buildUrlFromTemplate(template, { id: driverId });
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url, { headers }).catch(() => null);
    if (!res) return null;
    const data = await safeJson(res);
    const c = extractUserCandidate(data);
    return { id: String(driverId), name: pickCommonName(c), phone: pickCommonPhone(c), email: pickCommonEmail(c) };
  } catch (_) { return null; }
}

async function getDriversByIds(ids = [], options = undefined) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const base = process.env.AUTH_BASE_URL;
    if (!base) {
      const results = await Promise.all((ids || []).map(id => getDriverById(id, options)));
      return results.filter(Boolean);
    }
    const url = `${base.replace(/\/$/, '')}/drivers/batch`;
    const headers = authHeadersFromOptions(options);
    headers['Content-Type'] = 'application/json';
    const res = await axios.post(url, { ids }, { headers }).catch(() => null);
    if (!res) {
      const results = await Promise.all((ids || []).map(id => getDriverById(id, options)));
      return results.filter(Boolean);
    }
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({
      id: String(u.id || u._id || ''),
      name: u.name || u.fullName,
      phone: u.phone || u.msisdn,
      email: u.email || u.profile?.email
    }));
  } catch (_) {
    const results = await Promise.all((ids || []).map(id => getDriverById(id, options)));
    return results.filter(Boolean);
  }
}

async function listPassengers(query = {}, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/passengers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url.toString(), { headers }).catch(() => null);
    if (!res) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn, email: u.email || u.profile?.email }));
  } catch (_) { return []; }
}

async function listDrivers(query = {}, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/drivers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url.toString(), { headers }).catch(() => null);
    if (!res) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn, email: u.email || u.profile?.email }));
  } catch (_) { return []; }
}

async function getStaffById(staffId, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base || !staffId) return null;
    const url = `${base.replace(/\/$/, '')}/staff/${encodeURIComponent(String(staffId))}`;
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url, { headers }).catch(() => null);
    if (!res) return null;
    const data = await safeJson(res);
    const u = extractUserCandidate(data);
    return { id: String(u.id || u._id || staffId), name: pickCommonName(u), phone: pickCommonPhone(u), email: pickCommonEmail(u) };
  } catch (_) { return null; }
}

async function listStaff(query = {}, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/staff`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url.toString(), { headers }).catch(() => null);
    if (!res) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn, email: u.email || u.profile?.email }));
  } catch (_) { return []; }
}

async function getAdminById(adminId, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base || !adminId) return null;
    const url = `${base.replace(/\/$/, '')}/admins/${encodeURIComponent(String(adminId))}`;
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url, { headers }).catch(() => null);
    if (!res) return null;
    const data = await safeJson(res);
    const u = extractUserCandidate(data);
    return { id: String(u.id || u._id || adminId), name: pickCommonName(u), phone: pickCommonPhone(u), email: pickCommonEmail(u) };
  } catch (_) { return null; }
}

async function listAdmins(query = {}, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/admins`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = authHeadersFromOptions(options);
    const res = await axios.get(url.toString(), { headers }).catch(() => null);
    if (!res) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn, email: u.email || u.profile?.email }));
  } catch (_) { return []; }
}

// Compatibility wrappers used in some controllers
async function getPassengerDetails(id, token) {
  const headers = token ? { Authorization: token } : undefined;
  const u = await getPassengerById(id, { headers });
  return u ? { success: true, user: u } : { success: false, message: 'Not found' };
}

async function getDriverDetails(id, token) {
  const headers = token ? { Authorization: token } : undefined;
  const u = await getDriverById(id, { headers });
  return u ? { success: true, user: u } : { success: false, message: 'Not found' };
}

module.exports = {
  getPassengerById,
  getDriverById,
  getDriversByIds,
  listPassengers,
  listDrivers,
  getStaffById,
  listStaff,
  getAdminById,
  listAdmins,
  getPassengerDetails,
  getDriverDetails
};

