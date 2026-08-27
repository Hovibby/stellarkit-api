const request = require("supertest");
const app = require("../src/index");
const { server } = require("../src/config/stellar");
const cacheService = require("../src/services/cache");

const VALID_ADDRESS = "GDMYUMHY5HURM37HQRIQVFTIL5FMHDZOZMBKFJY4OA32PJVMTCCLECLH";
const ANOTHER_VALID_ADDRESS = "GCUGJ3ANB5NK637VLHEZ23K57IBZ2JNVTY773KSQHIFWNIYCFBB64QLB";

function mockAccountLoad(address, balances = []) {
  return {
    id: address,
    balances: [
      { asset_type: "native", balance: "100.0000000", buying_liabilities: "0", selling_liabilities: "0" },
      ...balances,
    ],
  };
}

beforeEach(() => {
  cacheService.flush();
  jest.restoreAllMocks();
});

describe("POST /account/balances (batch)", () => {
  it("returns balances for multiple valid addresses", async () => {
    jest.spyOn(server, "loadAccount").mockImplementation(async (id) => {
      if (id === VALID_ADDRESS) return mockAccountLoad(id);
      if (id === ANOTHER_VALID_ADDRESS) return mockAccountLoad(id, [
        { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", balance: "50.0000000", limit: "10000000", buying_liabilities: "0", selling_liabilities: "0", is_authorized: true, is_clawback_enabled: false },
      ]);
      throw new Error("Unknown account");
    });

    const res = await request(app)
      .post("/account/balances")
      .send({ addresses: [VALID_ADDRESS, ANOTHER_VALID_ADDRESS] });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toBeDefined();
    expect(res.body.data.results[VALID_ADDRESS]).toBeDefined();
    expect(res.body.data.results[VALID_ADDRESS].balances).toBeDefined();
    expect(res.body.data.results[VALID_ADDRESS].balances.xlm).toBeDefined();
    expect(res.body.data.results[ANOTHER_VALID_ADDRESS]).toBeDefined();
    expect(res.body.data.results[ANOTHER_VALID_ADDRESS].balances.assets).toHaveLength(1);
  });

  it("returns 400 if addresses is missing", async () => {
    const res = await request(app).post("/account/balances").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("addresses");
  });

  it("returns 400 if more than 20 addresses are provided", async () => {
    const tooManyAddresses = Array(21).fill(VALID_ADDRESS);
    const res = await request(app).post("/account/balances").send({ addresses: tooManyAddresses });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("Maximum of 20");
  });

  it("returns error entry for invalid addresses", async () => {
    jest.spyOn(server, "loadAccount").mockImplementation(async (id) => {
      if (id === VALID_ADDRESS) return mockAccountLoad(id);
      throw new Error("Unknown");
    });

    const res = await request(app)
      .post("/account/balances")
      .send({ addresses: [VALID_ADDRESS, "INVALID_ADDRESS"] });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results[VALID_ADDRESS].balances).toBeDefined();
    expect(res.body.data.results["INVALID_ADDRESS"].error).toBeDefined();
    expect(res.body.data.results["INVALID_ADDRESS"].error.type).toBe("InvalidAccountId");
  });

  it("returns error entry for non-existent accounts", async () => {
    jest.spyOn(server, "loadAccount").mockImplementation(async () => {
      const horizonError = { response: { status: 404, data: { title: "Not Found" } } };
      throw horizonError;
    });

    const res = await request(app).post("/account/balances").send({ addresses: [VALID_ADDRESS] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results[VALID_ADDRESS].error).toBeDefined();
    expect(res.body.data.results[VALID_ADDRESS].error.type).toBe("AccountNotFound");
  });

  it("returns empty results for empty addresses array", async () => {
    const res = await request(app).post("/account/balances").send({ addresses: [] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toEqual({});
  });

  it("handles mixed valid, invalid, and non-existent addresses", async () => {
    jest.spyOn(server, "loadAccount").mockImplementation(async (id) => {
      if (id === VALID_ADDRESS) return mockAccountLoad(id);
      const horizonError = { response: { status: 404, data: { title: "Not Found" } } };
      throw horizonError;
    });

    const res = await request(app)
      .post("/account/balances")
      .send({ addresses: [VALID_ADDRESS, "NOT_VALID", ANOTHER_VALID_ADDRESS] });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results[VALID_ADDRESS].balances).toBeDefined();
    expect(res.body.data.results["NOT_VALID"].error).toBeDefined();
    expect(res.body.data.results[ANOTHER_VALID_ADDRESS].error).toBeDefined();
  });
});
