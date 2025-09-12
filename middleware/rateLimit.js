const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 30, keyGenerator } = {}) {
return (req, res, next) => {
const now = Date.now();
const key = (keyGenerator ? keyGenerator(req) : `${req.ip}:${req.path}`);
let bucket = buckets.get(key);
if (!bucket) { bucket = { resetAt: now + windowMs, count: 0 }; buckets.set(key, bucket); }
if (now > bucket.resetAt) { bucket.resetAt = now + windowMs; bucket.count = 0; }
bucket.count += 1;
if (bucket.count > max) { return res.status(429).json({ message: 'Too many requests' }); }
next();
};
}

module.exports = rateLimit;


