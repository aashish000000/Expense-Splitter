const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const generalLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests, please try again later'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts, please try again after 15 minutes'
);

const apiLimiter = createRateLimiter(
  60 * 1000,
  60,
  'API rate limit exceeded, please slow down'
);

module.exports = { generalLimiter, authLimiter, apiLimiter };
