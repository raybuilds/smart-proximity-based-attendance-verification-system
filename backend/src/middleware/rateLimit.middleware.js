const rateLimitCache = new Map();

function exportRateLimiter(req, res, next) {
  const teacherId = req.user?.sub;
  if (!teacherId) {
    return next();
  }

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxLimit = 5;

  let requestLogs = rateLimitCache.get(teacherId) || [];
  // Filter out logs older than the current window
  requestLogs = requestLogs.filter(timestamp => now - timestamp < windowMs);

  if (requestLogs.length >= maxLimit) {
    return res.status(429).json({
      success: false,
      message: "Too many export requests. Please try again later."
    });
  }

  requestLogs.push(now);
  rateLimitCache.set(teacherId, requestLogs);
  next();
}

module.exports = { exportRateLimiter };
