const { StrKey } = require("@stellar/stellar-sdk");

function qp(param, msg) {
  return `Query param '${param}' ${msg}`;
}

function makeInvalidAccountIdError(accountId) {
  const err = new Error(`"${String(accountId).slice(0, 60)}" is not a valid Stellar account address.`);
  err.isInvalidAccountId = true;
  err.accountId = accountId;
  err.suggestion = "Account addresses start with G and are 56 characters long.";
  err.status = 400;
  return err;
}

function makeInvalidAssetError(message, suggestion) {
  const err = new Error(message);
  err.isInvalidAsset = true;
  err.suggestion = suggestion || null;
  err.status = 400;
  return err;
}

function makeValidationError(message, field, receivedValue, expectedFormat) {
  const err = new Error(message);
  err.isValidation = true;
  err.field = field;
  err.receivedValue = receivedValue !== undefined ? String(receivedValue).slice(0, 50) : undefined;
  err.expectedFormat = expectedFormat;
  return err;
}

function validateAccountId(accountId) {
  if (typeof accountId !== "string" || !StrKey.isValidEd25519PublicKey(accountId)) {
    throw makeInvalidAccountIdError(accountId);
  }
}

function validateStellarAddress(address) {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith("G")) return false;
  if (trimmed.length !== 56) return false;
  return StrKey.isValidEd25519PublicKey(trimmed);
}

function validateContractId(contractId) {
  if (!contractId) {
    throw makeValidationError("Contract ID is required.", "contractId", contractId, "C...");
  }
  if (!StrKey.isValidContract(contractId)) {
    throw makeValidationError(`Invalid Soroban contract ID.`, "contractId", contractId, "C...");
  }
}

function validateAssetCode(code) {
  if (!code) throw makeValidationError(qp("assetCode", "is required."), "assetCode", code, "USDC");
  if (!/^[A-Z0-9]{1,12}$/.test(code.toUpperCase())) {
    throw makeValidationError(qp("assetCode", "must be 1-12 uppercase alphanumeric characters."), "assetCode", code, "USDC");
  }
}

function validateLimit(limit, max = 100) {
  const parsed = parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > max) {
    const err = new Error("limit must be a number between 1 and 100.");
    err.isInvalidLimit = true;
    err.status = 400;
    throw err;
  }
  return parsed;
}

function validateOrder(order) {
  if (!order) return "desc";
  const lowerOrder = String(order).toLowerCase();
  if (!["asc", "desc"].includes(lowerOrder)) {
    throw makeValidationError(`Invalid order parameter: "${order}".`, qp("order", 'must be "asc" or "desc".'), order, "asc or desc");
  }
  return lowerOrder;
}

function validateAsset(code, issuer) {
  if (!code) throw makeInvalidAssetError("Asset code is required.");
  if (code.length > 12) throw makeInvalidAssetError(`Asset code is too long.`);
  if (!/^[A-Za-z0-9]{1,12}$/.test(code)) throw makeInvalidAssetError(`Asset code contains invalid characters.`);
  if (!issuer) throw makeInvalidAssetError("Asset issuer is required.");
  if (!StrKey.isValidEd25519PublicKey(issuer)) throw makeInvalidAssetError(`Issuer address is not a valid Stellar public key.`);
}

const CURSOR_PATTERN = /^[A-Za-z0-9-]+$/;
function validateCursor(cursor) {
  if (cursor === null || cursor === undefined || typeof cursor !== "string" || cursor.trim() === "" || !CURSOR_PATTERN.test(cursor)) {
    const err = new Error("The provided cursor value is invalid.");
    err.isInvalidCursor = true;
    err.status = 400;
    throw err;
  }
  return cursor;
}

function validateISODate(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(`Query param '${field}' must be a valid ISO 8601 date string.`, field, value, "ISO 8601 date string");
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw makeValidationError(`Query param '${field}' is not a valid date.`, field, value, "ISO 8601 date string");
  }
  return date;
}

function validateCredentialType(type) {
  if (typeof type !== "string") return false;
  const trimmed = type.trim();
  if (!trimmed || trimmed.length > 64) return false;
  return /^[A-Za-z0-9._-]+$/.test(trimmed);
}

module.exports = {
  validateAccountId, validateContractId, validateAssetCode, validateLimit,
  validateOrder, validateAsset, validateCursor, validateISODate,
  validateStellarAddress, validateCredentialType,
};
