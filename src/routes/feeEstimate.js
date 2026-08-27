const express = require("express");
const router = express.Router();
const { server } = require("../config/stellar");
const { success } = require("../utils/response");
const { parseStellarAmount } = require("../utils/parseStellarAmount");

router.get("/", async (req, res) => {
  try {
    const feeStats = await server.feeStats();
    const base = parseInt(feeStats.fee_charged.p10);
    const recommended = parseInt(feeStats.fee_charged.p50);
    const priority = parseInt(feeStats.fee_charged.p95);
    return success(res, {
      note: "Fee estimates for a transaction with 1 operation.",
      perOperation: {
        economy: { stroops: parseInt(feeStats.fee_charged.min), xlm: parseStellarAmount(parseInt(feeStats.fee_charged.min)) },
        standard: { stroops: recommended, xlm: parseStellarAmount(recommended) },
        priority: { stroops: priority, xlm: parseStellarAmount(priority) },
      },
    });
  } catch (err) { return success(res, { note: "Fee estimate unavailable" }); }
});

module.exports = router;
