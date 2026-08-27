const express = require("express");
const router = express.Router();
const registerParamValidation = require("../middleware/validateRouteParams");
registerParamValidation(router);
const { server, NETWORK } = require("../config/stellar");
const { success, toISOTimestamp } = require("../utils/response");
const { validateAccountId } = require("../utils/validators");
const { parsePaginationParams } = require("../utils/pagination");
const { makeAccountNotFoundError } = require("../utils/errors");
const { parseStellarAmount } = require("../utils/parseStellarAmount");

function handleAccountNotFound(err, next, accountId) {
  if (err && err.response && err.response.status === 404) return next(makeAccountNotFoundError(accountId, NETWORK));
  if (err && err.isAccountNotFound) return next(err);
  next(err);
}

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const { limit, order, cursor } = parsePaginationParams(req.query);
    let query = server.transactions().forAccount(id).limit(limit).order(order).includeFailed(false);
    if (cursor) query = query.cursor(cursor);
    const txResponse = await query.call();
    const transactions = txResponse.records.map((tx) => {
      const chargedInStroops = parseInt(tx.fee_charged, 10);
      const opCount = tx.operation_count || 1;
      const perOpStroops = Math.floor(chargedInStroops / opCount);
      return {
        id: tx.id, hash: tx.hash, transactionHash: tx.hash,
        ledger: typeof tx.ledger === "number" ? tx.ledger : tx.ledger_attr,
        createdAt: toISOTimestamp(tx.created_at), sourceAccount: tx.source_account,
        fee: { charged: tx.fee_charged, chargedInXLM: parseStellarAmount(chargedInStroops), max: tx.max_fee, maxInXLM: parseStellarAmount(parseInt(tx.max_fee, 10)), account: tx.fee_account },
        feeSummary: { chargedInStroops, chargedInXLM: parseStellarAmount(chargedInStroops), perOperationInStroops: perOpStroops, perOperationInXLM: parseStellarAmount(perOpStroops) },
        operationCount: tx.operation_count, memoType: tx.memo_type, memo: tx.memo || null,
        successful: tx.successful, envelopeXdr: tx.envelope_xdr,
      };
    });
    return success(res, { items: transactions, total: transactions.length, limit, cursor: txResponse.records.length > 0 ? txResponse.records[txResponse.records.length - 1].paging_token : null });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

router.get("/:id/operations", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const { limit, order, cursor } = parsePaginationParams(req.query);
    let query = server.operations().forAccount(id).limit(limit).order(order);
    if (cursor) query = query.cursor(cursor);
    const opResponse = await query.call();
    const operations = opResponse.records.map((op) => ({
      id: op.id, type: op.type, createdAt: toISOTimestamp(op.created_at),
      transactionHash: op.transaction_hash, transactionSuccessful: op.transaction_successful, sourceAccount: op.source_account,
    }));
    const lastRecord = opResponse.records[opResponse.records.length - 1];
    const nextCursor = lastRecord ? lastRecord.paging_token : null;
    return success(res, { items: operations, total: operations.length, limit, cursor: nextCursor });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

router.post("/batch-status", async (req, res, next) => {
  try {
    const { hashes } = req.body;
    if (!hashes || !Array.isArray(hashes)) {
      const err = new Error("Property 'hashes' is required and must be an array.");
      err.isValidation = true;
      throw err;
    }
    if (hashes.length === 0) return success(res, { items: [], total: 0 });
    if (hashes.length > 20) {
      const err = new Error("Maximum of 20 hashes allowed per request.");
      err.isValidation = true;
      throw err;
    }
    const hashRegex = /^[0-9a-fA-F]{64}$/;
    for (const hash of hashes) {
      if (!hashRegex.test(hash)) {
        const err = new Error(`Invalid transaction hash: "${hash}". Must be a 64-character hex string.`);
        err.isValidation = true;
        throw err;
      }
    }
    const statusResults = await Promise.all(hashes.map(async (hash) => {
      try {
        const tx = await server.transactions().transaction(hash).call();
        return { hash, found: true, successful: tx.successful, ledger: typeof tx.ledger === "number" ? tx.ledger : tx.ledger_attr, createdAt: toISOTimestamp(tx.created_at), fee: tx.fee_charged };
      } catch (err) {
        if (err.response && err.response.status === 404) return { hash, found: false };
        return { hash, found: false, error: "Lookup failed" };
      }
    }));
    return success(res, { items: statusResults, total: statusResults.length });
  } catch (err) { next(err); }
});

module.exports = router;
