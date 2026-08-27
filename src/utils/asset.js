const { Asset } = require("@stellar/stellar-sdk");

function normalizeAsset(code, issuer, type) {
  if (!code) return null;
  if (code === "XLM" || type === "native") {
    return { code: "XLM", issuer: null, type: "native" };
  }
  return { code, issuer, type: type || (code && code.length > 4 ? "credit_alphanum12" : "credit_alphanum4") };
}

function normalizeAssetFromString(assetString) {
  if (!assetString || assetString === "native") return { code: "XLM", issuer: null, type: "native" };
  const parts = assetString.split(":");
  if (parts.length === 2) return normalizeAsset(parts[0], parts[1]);
  return { code: assetString, issuer: null, type: "native" };
}

module.exports = { normalizeAsset, normalizeAssetFromString };
