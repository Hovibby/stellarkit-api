const express = require("express");
const router = express.Router();
const { server } = require("../config/stellar");
const { success } = require("../utils/response");
const cacheService = require("../services/cache");

router.get("/", async (req, res) => {
  try {
    const cached = cacheService.get("network-status");
    if (cached) return success(res, cached);
    const ledger = await server.ledgers().order("desc").limit(1).call();
    const latest = ledger.records[0];
    const data = {
      network: process.env.STELLAR_NETWORK || "testnet",
      latestLedger: { sequence: latest.sequence, closedAt: latest.closed_at, transactionCount: latest.successful_transaction_count },
    };
    cacheService.set("network-status", data, 5);
    return success(res, data);
  } catch (err) { return success(res, { network: process.env.STELLAR_NETWORK || "testnet" }); }
});

module.exports = router;
