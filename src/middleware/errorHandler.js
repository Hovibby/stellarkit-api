const logger = require("../utils/logger");
const StellarKitError = require("../utils/StellarKitError");

function logError(status, req, message) {
  if (process.env.NODE_ENV === "test") return;
  if (status >= 400) {
    const logLevel = status >= 500 ? "error" : "warn";
    logger[logLevel]({ requestId: req.requestId || "-", method: req.method, path: req.path, status }, message);
  }
}

function withRequestId(body, req) {
  return { ...body, requestId: req.requestId || null };
}

function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || (err.cause && err.cause.code);
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("econnrefused") || msg.includes("enotfound");
}

function errorHandler(err, req, res, next) {
  if (isConnectionError(err)) {
    logError(503, req, "Unable to connect to the Stellar Horizon node.");
    return res.status(503).json(withRequestId({ success: false, error: { type: "HorizonUnavailable", message: "Unable to connect to the Stellar Horizon node." } }, req));
  }

  if (err && err.response && err.response.data) {
    const horizonError = err.response.data;
    const resultCode = horizonError?.extras?.result_codes?.transaction || horizonError?.extras?.result_codes?.operations?.[0];
    const mappedStatus = { tx_bad_seq: 409, op_no_destination: 404, op_low_reserve: 422 }[resultCode];
    const status = mappedStatus ?? err.response.status ?? 400;
    logError(status, req, horizonError.detail || "Horizon Error");
    return res.status(status).json(withRequestId({
      success: false,
      error: { type: "HorizonError", title: horizonError.title, detail: horizonError.detail, status: err.response.status },
    }, req));
  }

  if (err instanceof StellarKitError) {
    logError(err.statusCode, req, err.message);
    return res.status(err.statusCode).json(withRequestId({ success: false, error: err.toJSON() }, req));
  }

  if (err.type === "entity.too.large" || err.status === 413) {
    const maxBodySizeKB = process.env.MAX_BODY_SIZE_KB || "10";
    const message = `Request body exceeds the maximum allowed size of ${maxBodySizeKB}KB.`;
    logError(413, req, message);
    return res.status(413).json(withRequestId({ success: false, error: { type: "PayloadTooLarge", message } }, req));
  }

  if (err.isAccountNotFound) {
    logError(404, req, err.message);
    return res.status(404).json(withRequestId({ success: false, error: { type: "AccountNotFound", message: err.message } }, req));
  }

  if (err.isTransactionNotFound) {
    logError(404, req, err.message);
    return res.status(404).json(withRequestId({ success: false, error: { type: "NotFound", message: err.message } }, req));
  }

  if (err.isAssetNotFound) {
    logError(404, req, err.message);
    return res.status(404).json(withRequestId({ success: false, error: { type: "AssetNotFound", message: err.message } }, req));
  }

  if (err.isTrustlineNotFound) {
    logError(404, req, err.message);
    return res.status(404).json(withRequestId({ success: false, error: { type: "TrustlineNotFound", message: err.message } }, req));
  }

  if (err.isTomlFetchFailed) {
    logError(502, req, err.message);
    return res.status(502).json(withRequestId({ success: false, error: { type: "TomlFetchFailed", message: err.message } }, req));
  }

  if (err.isInvalidAccountId) {
    logError(400, req, err.message);
    return res.status(400).json(withRequestId({ success: false, error: { type: "InvalidAccountId", message: err.message, suggestion: err.suggestion } }, req));
  }

  if (err.isInvalidAsset) {
    logError(400, req, err.message);
    return res.status(400).json(withRequestId({ success: false, error: { type: "InvalidAsset", message: err.message } }, req));
  }

  if (err.isInvalidCursor) {
    logError(400, req, err.message);
    return res.status(400).json(withRequestId({ success: false, error: { type: "InvalidCursor", message: err.message } }, req));
  }

  if (err.isInvalidLimit) {
    logError(400, req, err.message);
    return res.status(400).json(withRequestId({ success: false, error: { type: "InvalidLimit", message: "limit must be a number between 1 and 100." } }, req));
  }

  if (err.isValidation) {
    logError(400, req, err.message);
    return res.status(400).json(withRequestId({
      success: false,
      error: { type: "ValidationError", message: err.message, field: err.field, receivedValue: err.receivedValue, expectedFormat: err.expectedFormat },
    }, req));
  }

  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message;
  logError(status, req, err.message);
  return res.status(status).json(withRequestId({ success: false, error: { type: "ServerError", message } }, req));
}

module.exports = errorHandler;
