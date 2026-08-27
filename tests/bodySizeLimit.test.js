const request = require("supertest");
const app = require("../src/index");

describe("Request body size limits", () => {
    it("returns 413 PayloadTooLarge for oversized JSON bodies", async () => {
        const largePayload = { data: "x".repeat(11000) };
        const res = await request(app)
            .post("/health")
            .set("Content-Type", "application/json")
            .send(largePayload);

        expect(res.statusCode).toBe(413);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatchObject({
            type: "PayloadTooLarge",
            message: expect.stringContaining("Request body exceeds the maximum allowed size"),
        });
    });

    it("accepts valid-sized JSON bodies", async () => {
        const smallPayload = { data: "x".repeat(100) };
        const res = await request(app)
            .post("/health")
            .set("Content-Type", "application/json")
            .send(smallPayload);

        expect(res.statusCode).not.toBe(413);
    });

    it("uses MAX_BODY_SIZE_KB env var when configured", () => {
        const originalKB = process.env.MAX_BODY_SIZE_KB;
        const originalRaw = process.env.MAX_BODY_SIZE;
        process.env.MAX_BODY_SIZE_KB = "5";
        delete process.env.MAX_BODY_SIZE;
        jest.resetModules();

        const { MAX_BODY_SIZE } = require("../src/middleware/bodySizeLimit");
        expect(MAX_BODY_SIZE).toBe("5kb");

        process.env.MAX_BODY_SIZE_KB = originalKB;
        if (originalRaw !== undefined) process.env.MAX_BODY_SIZE = originalRaw;
    });

    it("MAX_BODY_SIZE_KB takes precedence over MAX_BODY_SIZE", () => {
        const originalKB = process.env.MAX_BODY_SIZE_KB;
        const originalRaw = process.env.MAX_BODY_SIZE;
        process.env.MAX_BODY_SIZE_KB = "20";
        process.env.MAX_BODY_SIZE = "1kb";
        jest.resetModules();

        const { MAX_BODY_SIZE } = require("../src/middleware/bodySizeLimit");
        expect(MAX_BODY_SIZE).toBe("20kb");

        process.env.MAX_BODY_SIZE_KB = originalKB;
        if (originalRaw !== undefined) process.env.MAX_BODY_SIZE = originalRaw;
    });

    it("falls back to default 10kb when no env vars set", () => {
        const originalKB = process.env.MAX_BODY_SIZE_KB;
        const originalRaw = process.env.MAX_BODY_SIZE;
        delete process.env.MAX_BODY_SIZE_KB;
        delete process.env.MAX_BODY_SIZE;
        jest.resetModules();

        const { MAX_BODY_SIZE } = require("../src/middleware/bodySizeLimit");
        expect(MAX_BODY_SIZE).toBe("10kb");

        if (originalKB !== undefined) process.env.MAX_BODY_SIZE_KB = originalKB;
        if (originalRaw !== undefined) process.env.MAX_BODY_SIZE = originalRaw;
    });
});
