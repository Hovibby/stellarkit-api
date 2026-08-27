const express = require("express");
const router = express.Router();
const { server, NETWORK, fetchAccountCreation } = require("../config/stellar");
const { success, toISOTimestamp } = require("../utils/response");
const { makeAccountNotFoundError, makeTrustlineNotFoundError } = require("../utils/errors");
const cacheService = require("../services/cache");
const cacheTTL = require("../config/cacheConfig");
const {
  validateAccountId, validateAssetCode, validateLimit, validateISODate, validateStellarAddress,
} = require("../utils/validators");
const registerParamValidation = require("../middleware/validateRouteParams");
registerParamValidation(router);
const { buildAccountAgeResponse } = require("../utils/accountAge");
const { parsePaginationParams } = require("../utils/pagination");
const { normalizeAsset, normalizeAssetFromString } = require("../utils/asset");
const { isNativeAsset, isNonNativeAsset } = require("../utils/assetHelpers");
const { formatBalance } = require("../utils/formatBalance");
const { parseStellarAmount } = require("../utils/parseStellarAmount");
const { formatAmount } = require("../utils/formatAmount");
const { Asset } = require("@stellar/stellar-sdk");

const CACHE_TTL_ACCOUNT = parseInt(process.env.CACHE_TTL_ACCOUNT_MS, 10) / 1000 || 10;

function normalizeSignerType(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "ed25519_public_key" || normalized === "ed25519" || normalized === "signer_key_type_ed25519") return "ed25519_public_key";
  if (normalized === "sha256_hash" || normalized === "hash_x" || normalized === "signer_key_type_hash_x") return "hash_x";
  if (normalized === "preauth_tx" || normalized === "pre_auth_tx" || normalized === "signer_key_type_pre_auth_tx") return "pre_auth_tx";
  return type || "unknown";
}

function handleAccountNotFound(err, next, accountId) {
  if (err && err.response && err.response.status === 404) return next(makeAccountNotFoundError(accountId, NETWORK));
  if (err && err.isAccountNotFound) return next(err);
  next(err);
}

function formatAccountBalances(account) {
  const xlmBalance = (account.balances || []).find((b) => isNativeAsset(b));
  const assets = (account.balances || [])
    .filter((b) => isNonNativeAsset(b))
    .map((b) => ({
      asset: normalizeAsset(b.asset_code, b.asset_issuer, b.asset_type),
      balance: b.balance,
      limit: b.limit,
      buyingLiabilities: b.buying_liabilities,
      sellingLiabilities: b.selling_liabilities,
      isAuthorized: b.is_authorized,
      isClawbackEnabled: b.is_clawback_enabled,
    }));
  return {
    xlm: {
      balance: xlmBalance ? formatBalance(xlmBalance.balance) : formatBalance("0.0000000"),
      buyingLiabilities: xlmBalance ? formatBalance(xlmBalance.buying_liabilities) : formatBalance("0"),
      sellingLiabilities: xlmBalance ? formatBalance(xlmBalance.selling_liabilities) : formatBalance("0"),
    },
    assets,
  };
}

// ─── GET /account/:id/balances ──────────────────────────────────────────────
router.get("/:id/balances", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const account = await server.loadAccount(id);
    const formatted = formatAccountBalances(account);
    return success(res, formatted);
  } catch (err) {
    handleAccountNotFound(err, next, req.params.id);
  }
});

// ─── GET /account/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const cacheKey = `account:${id}`;
    const fresh = req.query.fresh === "true";
    if (!fresh) {
      const cached = cacheService.get(cacheKey);
      if (cached) { res.set("X-Cache", "HIT"); return success(res, cached); }
    }
    const account = await server.loadAccount(id);
    const { xlm, assets } = formatAccountBalances(account);
    const signers = (account.signers || []).map((s) => ({
      key: s.key, weight: Number(s.weight) || 0, type: normalizeSignerType(s.type), sponsoredBy: s.sponsor || null,
    }));
    const thresholds = {
      lowThreshold: account.thresholds?.low_threshold ?? 0,
      medThreshold: account.thresholds?.med_threshold ?? 0,
      highThreshold: account.thresholds?.high_threshold ?? 0,
    };
    const data = { accountId: account.id, sequence: account.sequence, subentryCount: account.subentry_count, xlm, assets, assetCount: assets.length, signers, thresholds, homeDomain: account.home_domain || null, lastModifiedLedger: account.last_modified_ledger };
    cacheService.set(cacheKey, data, CACHE_TTL_ACCOUNT);
    res.set("X-Cache", "MISS");
    return success(res, data);
  } catch (err) {
    handleAccountNotFound(err, next, req.params.id);
  }
});

// ─── POST /account/balances (batch) ─────────────────────────────────────────
router.post("/balances", async (req, res, next) => {
  try {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
      const err = new Error("Property 'addresses' is required and must be an array of Stellar public keys.");
      err.isValidation = true;
      err.field = "addresses";
      return next(err);
    }
    if (addresses.length === 0) return success(res, { results: {} });
    if (addresses.length > 20) {
      const err = new Error("Maximum of 20 addresses allowed per request.");
      err.isValidation = true;
      err.field = "addresses";
      return next(err);
    }
    const results = {};
    await Promise.all(addresses.map(async (address) => {
      if (!validateStellarAddress(address)) {
        results[address] = { error: { type: "InvalidAccountId", message: `"${String(address).slice(0, 60)}" is not a valid Stellar account address.` } };
        return;
      }
      try {
        const account = await server.loadAccount(address);
        results[address] = { balances: formatAccountBalances(account) };
      } catch (err) {
        if (err && err.response && err.response.status === 404) {
          results[address] = { error: { type: "AccountNotFound", message: `Account ${address} was not found on the Stellar ${NETWORK} network.` } };
        } else {
          results[address] = { error: { type: "HorizonError", message: err.message || "Failed to fetch account from Horizon." } };
        }
      }
    }));
    return success(res, { results });
  } catch (err) { next(err); }
});

// ─── GET /account/:id/age ───────────────────────────────────────────────────
router.get("/:id/age", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const creation = await fetchAccountCreation(id);
    return success(res, buildAccountAgeResponse({ publicKey: id, createdAtLedger: creation.ledger, createdAt: creation.timestamp }));
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

// ─── GET /account/:id/sequence ──────────────────────────────────────────────
router.get("/:id/sequence", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const account = await server.loadAccount(id);
    return success(res, { accountId: account.id, sequence: account.sequence, lastModifiedLedger: account.last_modified_ledger });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

// ─── GET /account/:id/signers ───────────────────────────────────────────────
router.get("/:id/signers", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const account = await server.loadAccount(id);
    const signers = (account.signers || []).map((s) => ({ key: s.key, weight: s.weight, type: s.type, sponsor: s.sponsor || null }));
    return success(res, {
      accountId: account.id, signers,
      thresholds: { lowThreshold: account.thresholds?.low_threshold || 0, medThreshold: account.thresholds?.med_threshold || 0, highThreshold: account.thresholds?.high_threshold || 0 },
    });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

// ─── GET /account/:id/effects ───────────────────────────────────────────────
router.get("/:id/effects", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const { limit, cursor } = parsePaginationParams(req.query, 200);
    await server.loadAccount(id);
    let query = server.effects().forAccount(id).limit(limit).order("desc");
    if (cursor) query = query.cursor(cursor);
    const response = await query.call();
    const records = response.records || [];
    const items = records.map((eff) => ({
      id: eff.id, type: eff.type, account: eff.account, createdAt: toISOTimestamp(eff.created_at),
      pagingToken: eff.paging_token, amount: eff.amount || null, asset: eff.asset_type ? normalizeAsset(eff.asset_code, eff.asset_issuer, eff.asset_type) : null,
    }));
    const nextCursor = records.length > 0 ? records[records.length - 1].paging_token : null;
    return success(res, { items, total: items.length, limit, cursor: nextCursor });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

// ─── GET /account/:id/operations ────────────────────────────────────────────
router.get("/:id/operations", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const { limit, cursor } = parsePaginationParams(req.query, 200);
    await server.loadAccount(id);
    let query = server.operations().forAccount(id).limit(limit).order("desc");
    if (cursor) query = query.cursor(cursor);
    const opResponse = await query.call();
    const records = opResponse.records || [];
    const operations = records.map((op) => ({
      operationId: op.id, type: op.type, createdAt: toISOTimestamp(op.created_at), transactionHash: op.transaction_hash,
    }));
    const nextCursor = records.length > 0 ? records[records.length - 1].paging_token : null;
    return success(res, { operations, total: operations.length, limit, cursor: nextCursor });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

// ─── GET /account/:id/trades ────────────────────────────────────────────────
router.get("/:id/trades", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const { limit, order, cursor } = parsePaginationParams(req.query);
    let query = server.trades().forAccount(id).limit(limit).order(order);
    if (cursor) query = query.cursor(cursor);
    const tradeResponse = await query.call();
    const records = tradeResponse.records || [];
    const trades = records.map((trade) => ({
      id: trade.id, ledgerCloseTime: toISOTimestamp(trade.ledger_close_time), offerId: trade.offer_id,
      baseAccount: trade.base_account, baseAmount: trade.base_amount, baseAsset: normalizeAsset(trade.base_asset_code, trade.base_asset_issuer, trade.base_asset_type),
      counterAccount: trade.counter_account, counterAmount: trade.counter_amount, counterAsset: normalizeAsset(trade.counter_asset_code, trade.counter_asset_issuer, trade.counter_asset_type),
    }));
    const nextCursor = records.length ? records[records.length - 1].paging_token : null;
    return success(res, { items: trades, total: trades.length, limit, cursor: nextCursor });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

// ─── GET /account/:id/offers ────────────────────────────────────────────────
router.get("/:id/offers", async (req, res, next) => {
  try {
    const { id } = req.params;
    validateAccountId(id);
    const { limit, order, cursor } = parsePaginationParams(req.query);
    let query = server.offers().forAccount(id).limit(limit).order(order);
    if (cursor) query = query.cursor(cursor);
    const offerResponse = await query.call();
    const offers = (offerResponse.records || []).map((offer) => ({
      id: offer.id, seller: offer.seller, selling: { ...normalizeAsset(offer.selling_asset_code, offer.selling_asset_issuer, offer.selling_asset_type), amount: parseFloat(offer.amount || "0").toFixed(7) },
      buying: normalizeAsset(offer.buying_asset_code, offer.buying_asset_issuer, offer.buying_asset_type), price: parseFloat(offer.price || "0").toFixed(7),
    }));
    const nextCursor = offers.length ? offerResponse.records[offerResponse.records.length - 1]?.paging_token : null;
    return success(res, { items: offers, total: offers.length, limit, cursor: nextCursor });
  } catch (err) { handleAccountNotFound(err, next, req.params.id); }
});

module.exports = router;
