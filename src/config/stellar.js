require("dotenv").config();
const { Horizon, rpc } = require("@stellar/stellar-sdk");

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || "testnet";
const NETWORK = STELLAR_NETWORK;

const HORIZON_URLS = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
};

const horizonUrl = process.env.HORIZON_URL || HORIZON_URLS[STELLAR_NETWORK] || HORIZON_URLS.testnet;
const server = new Horizon.Server(horizonUrl);

const sorobanRpcUrl = process.env.SOROBAN_RPC_URL || "";
const sorobanServer = sorobanRpcUrl ? new rpc.Server(sorobanRpcUrl) : null;

const STELLAR_NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";

async function fetchAccountCreation(accountId) {
  const operations = await server
    .operations()
    .forAccount(accountId)
    .order("asc")
    .limit(1)
    .call();

  if (operations.records.length === 0) {
    const err = new Error(`Account ${accountId} has no operations.`);
    err.isAccountNotFound = true;
    throw err;
  }

  const firstOp = operations.records[0];
  return {
    ledger: firstOp.ledger_attr || firstOp.ledger,
    timestamp: firstOp.created_at,
  };
}

module.exports = {
  server,
  sorobanServer,
  NETWORK,
  horizonUrl,
  STELLAR_NETWORK_PASSPHRASE,
  fetchAccountCreation,
};
