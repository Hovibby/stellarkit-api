const request = require("supertest");
const app = require("../../src/index");
const { getRouteCounts, resetRouteCounts } = require("../../src/middleware/routeCounter");
const { server } = require("../../src/config/stellar");

beforeEach(() => {
  resetRouteCounts();
  jest.restoreAllMocks();
});

describe("Route Counter Middleware", () => {
  it("increments counter for each request to a route", async () => {
    jest.spyOn(server, "ledgers").mockReturnValue({
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      call: jest.fn().mockResolvedValue({
        records: [{ sequence: 1, closed_at: "2024-01-01T00:00:00Z", successful_transaction_count: 1, operation_count: 1, total_coins: "100", fee_pool: "0", base_fee_in_stroops: 100, base_reserve_in_stroops: 10, protocol_version: 1 }],
      }),
    });
    jest.spyOn(server, "feeStats").mockResolvedValue({
      fee_charged: { min: "100", p10: "100", p50: "100", p95: "100", p99: "100", max: "100" },
      last_ledger_base_fee: "100", ledger_capacity_usage: "0.5",
    });

    await request(app).get("/health");
    await request(app).get("/health");
    await request(app).get("/health");

    const counts = getRouteCounts();
    expect(counts["GET /health"]).toBe(3);
  });

  it("returns empty object when no requests have been made", () => {
    const counts = getRouteCounts();
    expect(counts).toEqual({});
  });

  it("resets counters when resetRouteCounts() is called", async () => {
    jest.spyOn(server, "ledgers").mockReturnValue({
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      call: jest.fn().mockResolvedValue({
        records: [{ sequence: 1, closed_at: "2024-01-01T00:00:00Z", successful_transaction_count: 1, operation_count: 1, total_coins: "100", fee_pool: "0", base_fee_in_stroops: 100, base_reserve_in_stroops: 10, protocol_version: 1 }],
      }),
    });
    jest.spyOn(server, "feeStats").mockResolvedValue({
      fee_charged: { min: "100", p10: "100", p50: "100", p95: "100", p99: "100", max: "100" },
      last_ledger_base_fee: "100", ledger_capacity_usage: "0.5",
    });

    await request(app).get("/health");
    expect(getRouteCounts()["GET /health"]).toBe(1);

    resetRouteCounts();
    expect(getRouteCounts()).toEqual({});
  });

  it("returns plain object from getRouteCounts()", async () => {
    jest.spyOn(server, "ledgers").mockReturnValue({
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      call: jest.fn().mockResolvedValue({
        records: [{ sequence: 1, closed_at: "2024-01-01T00:00:00Z", successful_transaction_count: 1, operation_count: 1, total_coins: "100", fee_pool: "0", base_fee_in_stroops: 100, base_reserve_in_stroops: 10, protocol_version: 1 }],
      }),
    });
    jest.spyOn(server, "feeStats").mockResolvedValue({
      fee_charged: { min: "100", p10: "100", p50: "100", p95: "100", p99: "100", max: "100" },
      last_ledger_base_fee: "100", ledger_capacity_usage: "0.5",
    });

    await request(app).get("/health");
    const counts = getRouteCounts();
    expect(typeof counts).toBe("object");
    expect(counts).not.toBeInstanceOf(Map);
  });
});
