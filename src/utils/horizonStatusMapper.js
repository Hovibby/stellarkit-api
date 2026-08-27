const { translateHorizonError } = require("./horizonErrors");

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

module.exports = { mapHorizonErrorToStatus };
