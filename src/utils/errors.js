const HORIZON_TIMEOUT_MESSAGE = "The Stellar Horizon node did not respond in time.";
const HORIZON_TIMEOUT_SUGGESTION = "Try again in a few seconds. If the issue persists check the Stellar network status at https://status.stellar.org.";

function isHorizonTimeoutError(err) {
  if (!err) return false;
  if (err.isHorizonTimeout) return true;
  if (err.response && err.response.data) return false;
  const code = err.code || (err.cause && err.cause.code);
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") return true;
  if (err.name === "AbortError") return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("timeout") || msg.includes("timed out");
}

function makeHorizonTimeoutError() {
  const err = new Error(HORIZON_TIMEOUT_MESSAGE);
  err.isHorizonTimeout = true;
  err.status = 504;
  return err;
}

function makeAccountNotFoundError(accountId, network) {
  const err = new Error(`Account ${accountId} was not found on the Stellar ${network} network.`);
  err.isAccountNotFound = true;
  err.accountId = accountId;
  err.network = network;
  err.status = 404;
  return err;
}

function makeAssetNotFoundError(code, issuer, network) {
  const err = new Error(`Asset ${code}:${issuer} was not found on the Stellar ${network} network.`);
  err.isAssetNotFound = true;
  err.status = 404;
  return err;
}

function makeTrustlineNotFoundError(address, code, issuer) {
  const err = new Error(`Account '${address}' does not hold a trustline for ${code}:${issuer}.`);
  err.isTrustlineNotFound = true;
  err.status = 404;
  return err;
}

function makeTomlFetchFailedError(issuer) {
  const err = new Error(`Could not fetch stellar.toml for issuer '${issuer}'.`);
  err.isTomlFetchFailed = true;
  err.status = 502;
  return err;
}

module.exports = {
  HORIZON_TIMEOUT_MESSAGE, HORIZON_TIMEOUT_SUGGESTION, isHorizonTimeoutError,
  makeHorizonTimeoutError, makeAccountNotFoundError, makeAssetNotFoundError,
  makeTrustlineNotFoundError, makeTomlFetchFailedError,
};
