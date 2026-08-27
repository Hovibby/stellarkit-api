const StellarKitError = require("./StellarKitError");

function translateHorizonError(code) {
  const messages = {
    tx_bad_seq: "The transaction sequence number does not match the source account's sequence number.",
    tx_bad_auth: "The transaction is not authorized by the source account.",
    tx_insufficient_balance: "The source account does not have enough funds to cover the transaction.",
    tx_failed: "The transaction failed.",
    op_bad_auth: "The operation is not authorized.",
    op_no_destination: "The destination account does not exist.",
    op_no_trust: "The destination account does not have a trustline for the asset.",
    op_low_reserve: "The account does not have enough XLM to cover the minimum reserve.",
  };
  return messages[code] || null;
}

function mapHorizonErrorToStatus(code) {
  const statusMap = {
    tx_bad_seq: 409,
    tx_bad_auth: 401,
    tx_insufficient_balance: 400,
    op_bad_auth: 401,
    op_no_destination: 404,
    op_no_trust: 400,
    op_low_reserve: 422,
  };
  return statusMap[code] || null;
}

module.exports = { translateHorizonError, mapHorizonErrorToStatus };
