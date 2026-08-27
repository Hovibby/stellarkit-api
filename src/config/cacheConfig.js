function msToSeconds(ms) {
  const parsed = parseInt(ms, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed / 1000) : undefined;
}

const globalTTL = msToSeconds(process.env.CACHE_TTL_MS) || 5;

const cacheTTL = {
  networkStatus: msToSeconds(process.env.CACHE_TTL_NETWORK_STATUS_MS) || globalTTL,
  feeEstimate: msToSeconds(process.env.CACHE_TTL_FEE_ESTIMATE_MS) || globalTTL,
  baseFee: msToSeconds(process.env.CACHE_TTL_BASE_FEE_MS) || globalTTL,
  validators: msToSeconds(process.env.CACHE_TTL_VALIDATORS_MS) || 300,
  asset: msToSeconds(process.env.CACHE_TTL_ASSET_MS) || 30,
  assetPrice: msToSeconds(process.env.CACHE_TTL_ASSET_PRICE_MS) || globalTTL,
  trustlines: msToSeconds(process.env.CACHE_TTL_TRUSTLINES_MS) || 15,
  arbitrage: msToSeconds(process.env.CACHE_TTL_ARBITRAGE_MS) || globalTTL,
  transactionCount: msToSeconds(process.env.CACHE_TTL_TX_COUNT_MS) || 20,
  contractStorage: msToSeconds(process.env.CACHE_TTL_CONTRACT_STORAGE_MS) || 15,
  assetBalance: msToSeconds(process.env.CACHE_TTL_ASSET_BALANCE_MS) || 10,
  claimableBalances: globalTTL,
  effects: globalTTL,
  poolPositions: globalTTL,
  topMarkets: globalTTL,
  trades: globalTTL,
  poolTrades: globalTTL,
  sequence: 20,
  feePercentiles: globalTTL,
  freezeCheck: 30,
  signingKeys: 20,
};

module.exports = cacheTTL;
