let speakeasy;
let SPEAKEASY_AVAILABLE = false; // Force numeric fallback to keep send/verify consistent
try {
  // Optional dependency present or not; we won't use it to avoid mismatch
  // eslint-disable-next-line import/no-extraneous-dependencies
  speakeasy = require('speakeasy');
} catch (e) {
  // ignore
}
const crypto = require('crypto');
const createSingleSMSUtil = require('./sendSingleSMSUtil');

function hashSecret(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function createAdvancedOtpUtil(opts = {}) {
  const token = opts.token || process.env.GEEZSMS_TOKEN || '';
  const otpLength = Number.isInteger(opts.otpLength) ? opts.otpLength : 6;
  const otpExpirationSeconds = Number.isInteger(opts.otpExpirationSeconds) ? opts.otpExpirationSeconds : 300;
  const maxAttempts = Number.isInteger(opts.maxAttempts) ? opts.maxAttempts : 3;
  const lockoutSeconds = Number.isInteger(opts.lockoutSeconds) ? opts.lockoutSeconds : 1800;

  async function normalizePhone(phoneNumber) {
    if (!phoneNumber) throw new Error('Phone number is required');
    let normalized = phoneNumber.replace(/\D/g, '');
    if (normalized.match(/^(09|07)\d{7,8}$/)) {
      normalized = normalized.replace(/^0/, '251');
    } else if (normalized.match(/^251(9|7)\d{7,8}$/)) {
      // ok
    } else {
      throw new Error('Phone must be 9 or 10 digits starting with 9 or 7, optionally prefixed with 251');
    }
    return normalized;
  }

  async function generateAndSendOtp({ referenceType, referenceId, phoneNumber }) {
    const { Op, models } = require('../models');
    let phone;
    let phoneE164;
    let refType = referenceType || 'direct';
    let refId = referenceId || 0;
    if (phoneNumber) {
      phoneE164 = await normalizePhone(phoneNumber);
      phone = phoneE164.replace(/\D/g, '');
    } else {
      if (!referenceType || !referenceId) throw new Error('Reference type and ID are required');
      if (!['Passenger'].includes(referenceType)) throw new Error('Reference type must be Passenger');
      const Model = models.Passenger;
      if (!Model) throw new Error('Passenger model not available');
      const modelInstance = await Model.findByPk(referenceId);
      if (!modelInstance) throw new Error('Passenger not found');
      if (!modelInstance.phone) throw new Error('Passenger has no phone number');
      phoneE164 = await normalizePhone(modelInstance.phone);
      phone = phoneE164.replace(/\D/g, '');
      refType = referenceType;
      refId = referenceId;
    }

    const existingOtp = await models.Otp.findOne({ where: { phone, referenceType: refType, referenceId: refId, status: 'pending', expiresAt: { [Op.gt]: Date.now() } } });
    if (existingOtp) {
      const createdAtMs = existingOtp.createdAt ? new Date(existingOtp.createdAt).getTime() : null;
      const createdAgoSec = createdAtMs ? (Date.now() - createdAtMs) / 1000 : Number.POSITIVE_INFINITY;
      if (createdAgoSec < 30) {
        throw new Error(`Please wait ${30 - Math.floor(createdAgoSec)} seconds before requesting another OTP`);
      }
      await existingOtp.destroy();
    }

    const lockedOtp = await models.Otp.findOne({ where: { phone, referenceType: refType, referenceId: refId, status: 'locked', expiresAt: { [Op.gt]: Date.now() } } });
    if (lockedOtp) {
      const remainingSeconds = Math.ceil((lockedOtp.expiresAt - Date.now()) / 1000);
      throw new Error(`Account locked. Try again in ${remainingSeconds} seconds`);
    }

    await models.Otp.destroy({ where: { phone, referenceType: refType, referenceId: refId, [Op.or]: [ { expiresAt: { [Op.lt]: Date.now() } }, { status: { [Op.in]: ['verified','expired'] } } ] } });

    const min = 10 ** (otpLength - 1);
    const max = 10 ** otpLength - 1;
    const tokenValue = String(Math.floor(min + Math.random() * (max - min + 1)));
    const hashedSecret = hashSecret(tokenValue);
    const expiresAt = Date.now() + otpExpirationSeconds * 1000;
    await models.Otp.create({ phone, hashedSecret, expiresAt, attempts: 0, status: 'pending', referenceType: refType, referenceId: refId });

    // Dev aid: log OTP code when not in production
    try {
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        const displayPhone = (typeof phoneE164 !== 'undefined' && phoneE164) ? phoneE164 : ('+' + phone);
        console.log(`[OTP DEBUG] to=${displayPhone} code=${tokenValue}`);
      }
    } catch (_) { /* ignore */ }

    try {
      const sms = await createSingleSMSUtil({ token });
      const msg = `Your OTP is ${tokenValue}. It expires in ${Math.floor(otpExpirationSeconds/60)} minutes.`;
      const smsResult = await sms.sendSingleSMS({ phone: phoneE164 || ('+' + phone), msg });
      return { success: true, message: 'OTP sent successfully', expiresIn: otpExpirationSeconds, phoneNumber: phoneE164 || ('+' + phone), sms: smsResult.data };
    } catch (e) {
      // Do not fail OTP generation if SMS provider fails. Log and return success.
      console.log(`[OTP SMS ERROR] phone=${phoneE164 || ('+' + phone)} err=${e && e.message}`);
      return { success: true, message: 'OTP generated', expiresIn: otpExpirationSeconds, phoneNumber: phoneE164 || ('+' + phone) };
    }
  }

  async function verifyOtp({ referenceType, referenceId, token, phoneNumber }) {
    const { Op, models } = require('../models');
    if (!token) throw new Error('Token is required');
    let phone;
    let phoneE164;
    let refType = referenceType || 'direct';
    let refId = referenceId || 0;
    if (phoneNumber) {
      phoneE164 = await normalizePhone(phoneNumber);
      phone = phoneE164.replace(/\D/g, '');
    } else {
      if (!referenceType || !referenceId) throw new Error('Reference type and ID are required');
      if (!['Passenger'].includes(referenceType)) throw new Error('Reference type must be Passenger');
      const Model = models.Passenger;
      if (!Model) throw new Error('Passenger model not available');
      const modelInstance = await Model.findByPk(referenceId);
      if (!modelInstance) throw new Error('Passenger not found');
      if (!modelInstance.phone) throw new Error('Passenger has no phone number');
      phoneE164 = await normalizePhone(modelInstance.phone);
      phone = phoneE164.replace(/\D/g, '');
      refType = referenceType;
      refId = referenceId;
    }

    await models.Otp.destroy({ where: { phone, referenceType: refType, referenceId: refId, [Op.or]: [ { expiresAt: { [Op.lt]: Date.now() } }, { status: { [Op.in]: ['verified','expired'] } } ] } });

    const otp = await models.Otp.findOne({ where: { phone, referenceType: refType, referenceId: refId, status: 'pending' } });
    if (!otp) throw new Error('No valid OTP found');

    if (otp.attempts >= maxAttempts) {
      await otp.update({ status: 'locked', expiresAt: Date.now() + lockoutSeconds * 1000 });
      throw new Error(`Too many attempts. Account locked for ${lockoutSeconds / 60} minutes`);
    }
    if (Date.now() > otp.expiresAt) { await otp.update({ status: 'expired' }); throw new Error('OTP has expired'); }

    await otp.increment('attempts');

    const isValid = hashSecret(String(token)) === otp.hashedSecret;
    if (isValid) {
      await otp.update({ status: 'verified' });
      await models.Otp.destroy({ where: { phone, referenceType: refType, referenceId: refId } });
      return { success: true, message: 'OTP verified successfully' };
    }
    throw new Error('Invalid OTP');
  }

  return { generateAndSendOtp, verifyOtp };
}

module.exports = createAdvancedOtpUtil;


