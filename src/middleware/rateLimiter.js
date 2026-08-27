const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { type: "TooManyRequests", message: "Rate limit exceeded. Please try again later." },
    });
  },
});

function createAccountSummaryRateLimiter() {
  return rateLimit({
    windowMs: 60000,
    max: 10,
    keyGenerator: (req) => req.params.id || req.ip,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: { type: "TooManyRequests", message: "Rate limit exceeded for this endpoint." },
      });
    },
  });
}

module.exports = rateLimiter;
module.exports.accountSummaryRateLimiter = createAccountSummaryRateLimiter();
