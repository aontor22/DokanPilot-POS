const attempts = new Map();

export const loginRateLimit = (req, res, next) => {
  const key = String(req.ip || req.socket?.remoteAddress || "unknown");
  const now = Date.now();
  const bucket = attempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count <= 10) return next();
  res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
  return res.status(429).json({ success: false, message: "Too many login attempts. Try again later." });
};

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of attempts) if (bucket.resetAt <= now) attempts.delete(key);
}, 15 * 60 * 1000);
cleanup.unref?.();
