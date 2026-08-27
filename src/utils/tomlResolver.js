async function getAssetMetadataFromToml(homeDomain, assetCode) {
  try {
    const axios = require("axios");
    const url = `https://${homeDomain}/.well-known/stellar.toml`;
    const response = await axios.get(url, { timeout: 5000 });
    const toml = require("toml");
    const parsed = toml.parse(response.data);
    const currencies = parsed.CURRENCIES || [];
    const currency = currencies.find(
      (c) => c.code === assetCode || c.code === assetCode.toUpperCase()
    );
    return currency || null;
  } catch (_) {
    return null;
  }
}

module.exports = { getAssetMetadataFromToml };
