const axios = require('axios');

async function createSingleSMSUtil({ token, baseUrl, senderId, shortcodeId }) {
  const apiToken = token || process.env.GEEZSMS_TOKEN;
  const apiBase = (baseUrl || process.env.GEEZSMS_BASE_URL || 'https://api.geezsms.com/api/v1').replace(/\/$/, '');
  const from = senderId || process.env.GEEZSMS_SENDER_ID;
  const shortcode_id = shortcodeId || process.env.GEEZSMS_SHORTCODE_ID;

  if (!apiToken) {
    return {
      async sendSingleSMS({ phone, msg }) {
        console.log(`[SMS MOCK] to=${phone} msg=${msg}`);
        return { ok: true, data: { mocked: true } };
      }
    };
  }

  return {
    async sendSingleSMS({ phone, msg }) {
      const url = `${apiBase}/sms/send`;
      const payload = { phone, msg };
      if (from) payload.sender_id = from;
      if (shortcode_id) payload.shortcode_id = shortcode_id;

      try {
        const res = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'X-GeezSMS-Key': apiToken,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        return { ok: true, data: res.data };
      } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        let rawMessage = data?.message || data?.msg || data?.error || data?.detail || err.message || 'Failed to send SMS';
        if (typeof rawMessage === 'object') {
          try { rawMessage = JSON.stringify(rawMessage); } catch (_) { rawMessage = 'Failed to send SMS'; }
        }
        const message = String(rawMessage);
        const error = new Error(message);
        error.status = status;
        error.data = data;
        throw error;
      }
    }
  };
}

module.exports = createSingleSMSUtil;


