const { formatAmount } = require("./formatAmount");

function success(res, data, meta = {}) {
  return res.json({ success: true, ...meta, data });
}

function toISOTimestamp(value) {
  if (!value && value !== 0) return null;
  const ms = typeof value === "number" && value < 1e12 ? value * 1000 : value;
  return new Date(ms).toISOString();
}

const formatTimestamp = toISOTimestamp;

function stripLinks(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const { _links, ...rest } = obj;
  return rest;
}

const AMOUNT_KEYS = new Set([
  "amount", "balance", "startingbalance", "sourceamount", "destinationamount",
  "baseamount", "counteramount", "totalamount", "buyingliabilities",
  "sellingliabilities", "price", "priceinxlm", "effectiverate", "fee",
  "feecharged", "feepool", "basefeeinxlm", "basereserveinxlm", "maxinxlm", "xlm",
]);

function shouldNormalizeAmountKey(key, value) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") return false;
  const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!normalizedKey) return false;
  if (normalizedKey.includes("stroop")) return false;
  if (normalizedKey === "feebp" || normalizedKey === "pricenumerator" || normalizedKey === "pricedenominator") return false;
  return (
    AMOUNT_KEYS.has(normalizedKey) ||
    normalizedKey.endsWith("amount") ||
    normalizedKey.endsWith("balance") ||
    normalizedKey.endsWith("price") ||
    normalizedKey.endsWith("fee") ||
    normalizedKey.endsWith("liabilities")
  );
}

function normalizeAmountFields(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeAmountFields(item));
  if (!value || typeof value !== "object") return value;
  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    normalized[key] = shouldNormalizeAmountKey(key, entry) ? formatAmount(entry) : normalizeAmountFields(entry);
  }
  return normalized;
}

module.exports = { success, toISOTimestamp, formatTimestamp, stripLinks, normalizeAmountFields };
