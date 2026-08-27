function sanitize(req, res, next) {
  function cleanValue(val) {
    if (typeof val === "string") {
      return val.replace(/\0/g, "").trim();
    }
    return val;
  }

  function cleanObject(obj) {
    if (!obj || typeof obj !== "object") return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") {
        obj[key] = cleanValue(obj[key]);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        cleanObject(obj[key]);
      }
    }
    return obj;
  }

  if (req.body) cleanObject(req.body);
  if (req.query) cleanObject(req.query);
  if (req.params) cleanObject(req.params);
  next();
}

module.exports = sanitize;
