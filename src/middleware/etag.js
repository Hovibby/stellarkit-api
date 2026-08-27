const crypto = require("crypto");

function etagMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const etag = `"${crypto.createHash("md5").update(JSON.stringify(body)).digest("hex")}"`;
    res.setHeader("ETag", etag);

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    return originalJson(body);
  };
  next();
}

module.exports = etagMiddleware;
