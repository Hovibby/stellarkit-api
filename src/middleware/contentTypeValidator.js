function contentTypeValidator(req, res, next) {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      return res.status(415).json({
        success: false,
        error: { type: "UnsupportedMediaType", message: "Content-Type must be application/json." },
      });
    }
  }
  next();
}

module.exports = contentTypeValidator;
