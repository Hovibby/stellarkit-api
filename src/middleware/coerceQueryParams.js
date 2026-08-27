function coerceQueryParams(req, res, next) {
  const intParams = ["limit", "operations"];
  const boolParams = ["fresh", "sponsored", "includeOperations"];

  for (const param of intParams) {
    if (req.query[param] !== undefined) {
      const parsed = parseInt(req.query[param], 10);
      if (!isNaN(parsed)) req.query[param] = parsed;
    }
  }

  for (const param of boolParams) {
    if (req.query[param] !== undefined) {
      req.query[param] = req.query[param] === "true" || req.query[param] === true;
    }
  }

  next();
}

module.exports = coerceQueryParams;
