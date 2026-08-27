require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");

const logger = require("./utils/logger");
const { parseStellarAmount } = require("./utils/parseStellarAmount");
const { server } = require("./config/stellar");
const cacheService = require("./services/cache");

const rateLimiter = require("./middleware/rateLimiter");
const contentTypeValidator = require("./middleware/contentTypeValidator");
const bodySizeLimit = require("./middleware/bodySizeLimit");
const errorHandler = require("./middleware/errorHandler");
const requestIdMiddleware = require("./middleware/requestId");
const requestLogger = require("./middleware/requestLogger");
const apiKeyMiddleware = require("./middleware/apiKeyAuth");
const sanitize = require("./middleware/sanitize");
const coerceQueryParams = require("./middleware/coerceQueryParams");
const etagMiddleware = require("./middleware/etag");
const { routeCounter } = require("./middleware/routeCounter");

const networkStatusRouter = require("./routes/networkStatus");
const feeEstimateRouter = require("./routes/feeEstimate");
const accountRouter = require("./routes/account");
const transactionsRouter = require("./routes/transactions");
const assetRouter = require("./routes/asset");
const dexRouter = require("./routes/dex");
const liquidityPoolRouter = require("./routes/liquidityPool");
const streamRouter = require("./routes/stream");
const utilsRouter = require("./routes/utils");
const stellarTomlRouter = require("./routes/stellarToml");
const claimableBalancesRouter = require("./routes/claimableBalances");
const cacheStatsRouter = require("./routes/cacheStats");
const sorobanRouter = require("./routes/soroban");
const networkRouter = require("./routes/network");
const assetsOverviewRouter = require("./routes/assetsOverview");
const accountCounterpartiesRouter = require("./routes/account.counterparties");
const transactionEffectsRouter = require("./routes/transaction.effects");

const app = express();
app.disable("x-powered-by");
const { normalizeAmountFields } = require("./utils/response");

const PORT = process.env.PORT || 3000;

// ── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(cors());
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(contentTypeValidator);
app.use(bodySizeLimit);
app.use(hpp({ whitelist: ["limit", "order", "cursor", "operations"] }));
app.use(rateLimiter);
app.use(sanitize);
app.use(coerceQueryParams);
app.use(routeCounter);
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => originalJson(normalizeAmountFields(payload));
  next();
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    data: { status: "ok", service: "StellarKit API", version: require("../package.json").version, timestamp: new Date().toISOString(), network: process.env.STELLAR_NETWORK || "testnet" },
  });
});

// ── API Key Authentication ──────────────────────────────────────────────────
app.use(apiKeyMiddleware);

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/network-status", networkStatusRouter);
app.use("/network", networkStatusRouter);
app.use("/fee-estimate", feeEstimateRouter);
app.use("/account", etagMiddleware, accountRouter);
app.use("/account", etagMiddleware, accountCounterpartiesRouter);
app.use("/transactions", transactionsRouter);
app.use("/asset", etagMiddleware, assetRouter);
app.use("/dex", etagMiddleware, dexRouter);
app.use("/liquidity-pools", etagMiddleware, liquidityPoolRouter);
app.use("/assets-overview", etagMiddleware, assetsOverviewRouter);
app.use("/stream", streamRouter);
app.use("/utils", utilsRouter);
app.use("/stellar-toml", stellarTomlRouter);
app.use("/claimable-balances", etagMiddleware, claimableBalancesRouter);
app.use("/cache", cacheStatsRouter);
app.use("/soroban", sorobanRouter);
app.use("/network", etagMiddleware, networkRouter);
app.use("/transaction", etagMiddleware, transactionEffectsRouter);

// ── Root ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "StellarKit API",
      description: "A developer utility API for the Stellar blockchain.",
      version: require("../package.json").version,
      network: process.env.STELLAR_NETWORK || "testnet",
      endpoints: [
        { method: "GET", path: "/health", description: "Service health check" },
        { method: "GET", path: "/account/:id", description: "Account details" },
        { method: "GET", path: "/account/:id/balances", description: "Account balances" },
        { method: "POST", path: "/account/balances", description: "Batch balances for multiple addresses" },
        { method: "GET", path: "/transactions/:id", description: "Transaction history for an account" },
        { method: "GET", path: "/network-status", description: "Latest ledger and fees" },
      ],
    },
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { type: "NotFound", message: `Route ${req.method} ${req.path} not found.` } });
});

// ── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────────────────────
function startServer({ appInstance = app, port = PORT, logger: customLogger = console } = {}) {
  const httpServer = appInstance.listen(port, () => {
    customLogger.log(`StellarKit API running on port ${port}`);
  });
  return httpServer;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
