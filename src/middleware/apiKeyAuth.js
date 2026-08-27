const API_KEYS = (process.env.API_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);

function apiKeyAuth(req, res, next) {
  if (process.env.REQUIRE_API_KEY !== "true") return next();

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: { type: "Unauthorized", message: "Invalid or missing API key." },
    });
  }
  next();
}

module.exports = apiKeyAuth;
