const request = require("supertest");
const app = require("../src/index");
const { server } = require("../src/config/stellar");

const VALID_ID = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

describe("Transaction Batch Status Checker", () => {
  const VALID_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const ANOTHER_VALID_HASH = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

  afterEach(() => { jest.restoreAllMocks(); });

  it("returns status for multiple valid hashes", async () => {
    jest.spyOn(server, "transactions").mockReturnValue({
      transaction: jest.fn().mockImplementation((hash) => {
        if (hash === VALID_HASH) return { call: jest.fn().mockResolvedValue({ hash: VALID_HASH, successful: true, ledger: 12345, created_at: "2024-05-28T10:00:00Z", fee_charged: "100" }) };
        if (hash === ANOTHER_VALID_HASH) return { call: jest.fn().mockResolvedValue({ hash: ANOTHER_VALID_HASH, successful: false, ledger: 12346, created_at: "2024-05-28T10:05:00Z", fee_charged: "200" }) };
        return { call: jest.fn().mockRejectedValue({ response: { status: 404 } }) };
      }),
    });

    const res = await request(app).post("/transactions/batch-status").send({ hashes: [VALID_HASH, ANOTHER_VALID_HASH] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
  });

  it("returns 400 if more than 20 hashes", async () => {
    const tooManyHashes = Array(21).fill(VALID_HASH);
    const res = await request(app).post("/transactions/batch-status").send({ hashes: tooManyHashes });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain("Maximum of 20");
  });

  it("returns 400 for invalid hash format", async () => {
    const res = await request(app).post("/transactions/batch-status").send({ hashes: ["INVALID"] });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain("Invalid transaction hash");
  });
});
