const request = require("supertest");
const app = require("../src/index");
const { server } = require("../src/config/stellar");
const cacheService = require("../src/services/cache");

const VALID_ID = "GAIJ56CVCRXC2TB5SVUM5WOVMEMCMV4K47PWDI73SB24PPUOHRWRFKLG";

function mockTxRecord(overrides = {}) {
  return {
    id: "abc123def456",
    hash: "abc123def456789012345678901234567890abcdef0123456789abcdef01234567",
    ledger: 12345, ledger_attr: 12345,
    created_at: "2024-05-28T10:00:00Z", source_account: VALID_ID,
    fee_charged: "100", max_fee: "200", fee_account: "GBDPST2",
    operation_count: 2, memo_type: "text", memo: "test memo",
    successful: true, envelope_xdr: "AAAA...", paging_token: "123456789",
    ...overrides,
  };
}

function setupTxMock(records) {
  const chain = {
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    includeFailed: jest.fn().mockReturnThis(),
    cursor: jest.fn().mockReturnThis(),
    call: jest.fn().mockResolvedValue({ records }),
  };
  const forAccountFn = jest.fn().mockReturnValue(chain);
  jest.spyOn(server, "transactions").mockReturnValue({ forAccount: forAccountFn });
  return chain;
}

beforeEach(() => {
  cacheService.flush();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /transactions/:id", () => {
  it("returns live data from Horizon with normalised shape", async () => {
    setupTxMock([mockTxRecord()]);

    const res = await request(app).get(`/transactions/${VALID_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);

    const tx = res.body.data.items[0];
    expect(tx.hash).toBe("abc123def456789012345678901234567890abcdef0123456789abcdef01234567");
    expect(tx.transactionHash).toBe("abc123def456789012345678901234567890abcdef0123456789abcdef01234567");
    expect(tx.ledger).toBe(12345);
    expect(tx.createdAt).toBe("2024-05-28T10:00:00.000Z");
    expect(tx.operationCount).toBe(2);
    expect(tx.memo).toBe("test memo");
    expect(tx.successful).toBe(true);
  });

  it("supports limit, cursor, and order params", async () => {
    const chain = setupTxMock([]);

    const res = await request(app).get(`/transactions/${VALID_ID}?limit=5&order=asc&cursor=123`);
    expect(res.statusCode).toBe(200);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(chain.order).toHaveBeenCalledWith("asc");
  });

  it("returns empty items when no transactions exist", async () => {
    setupTxMock([]);

    const res = await request(app).get(`/transactions/${VALID_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it("returns 404 for non-existent accounts", async () => {
    const forAccountFn = jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      includeFailed: jest.fn().mockReturnThis(),
      cursor: jest.fn().mockReturnThis(),
      call: jest.fn().mockRejectedValue({ response: { status: 404 } }),
    });
    jest.spyOn(server, "transactions").mockReturnValue({ forAccount: forAccountFn });

    const res = await request(app).get(`/transactions/${VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for invalid account ID", async () => {
    const res = await request(app).get("/transactions/INVALID_ID");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.type).toBe("InvalidAccountId");
  });

  it("maps ledger from ledger_attr when ledger is not a number", async () => {
    setupTxMock([mockTxRecord({ ledger: "12345", ledger_attr: 12345 })]);

    const res = await request(app).get(`/transactions/${VALID_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].ledger).toBe(12345);
  });

  it("sets memo to null when memo is empty", async () => {
    setupTxMock([mockTxRecord({ memo: "", memo_type: "none" })]);

    const res = await request(app).get(`/transactions/${VALID_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].memo).toBeNull();
  });
});
