function registerParamValidation(router) {
  router.param("id", (req, res, next, value) => {
    if (!value || value.trim() === "") {
      return res.status(400).json({
        success: false,
        error: { type: "InvalidAccountId", message: "Account ID parameter cannot be empty." },
      });
    }
    next();
  });
}

module.exports = registerParamValidation;
