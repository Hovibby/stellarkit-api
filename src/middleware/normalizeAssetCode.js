function normalizeAssetCode(req, res, next) {
  if (req.params.code) req.params.code = req.params.code.toUpperCase();
  if (req.query.code) req.query.code = req.query.code.toUpperCase();
  next();
}

module.exports = normalizeAssetCode;
