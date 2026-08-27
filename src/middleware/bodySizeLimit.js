const express = require("express");

const DEFAULT_MAX_BODY_SIZE = "10kb";

function resolveMaxBodySize(kbValue, rawValue) {
  if (kbValue !== undefined && kbValue !== "") {
    const parsed = Number(kbValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return `${Math.round(parsed)}kb`;
    }
  }
  if (!rawValue) return DEFAULT_MAX_BODY_SIZE;
  const normalized = String(rawValue).trim().toLowerCase();
  if (/^[0-9]+$/.test(normalized)) return `${normalized}b`;
  if (/^[0-9]+(b|kb|mb|gb)$/.test(normalized)) return normalized;
  return DEFAULT_MAX_BODY_SIZE;
}

const requestBodySizeLimit = resolveMaxBodySize(
  process.env.MAX_BODY_SIZE_KB,
  process.env.MAX_BODY_SIZE,
);
const bodySizeLimit = express.json({ limit: requestBodySizeLimit });

module.exports = bodySizeLimit;
module.exports.MAX_BODY_SIZE = requestBodySizeLimit;
