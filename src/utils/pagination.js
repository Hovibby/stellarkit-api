const { validateLimit, validateOrder, validateCursor } = require("./validators");

function parsePaginationParams(query = {}, maxLimit = 100) {
  const limit = validateLimit(query.limit ?? 20, maxLimit);
  const order = validateOrder(query.order);

  if (query.cursor !== undefined) {
    const cursor = validateCursor(query.cursor);
    return { limit, order, cursor };
  }

  if (query.page !== undefined) {
    const parsed = Number(query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      const err = new Error("Query parameter 'page': must be a positive integer.");
      err.isValidation = true;
      err.status = 400;
      throw err;
    }
    if (parsed === 1) return { limit, order, cursor: undefined };
    return { limit, order, cursor: undefined, page: parsed };
  }

  return { limit, order, cursor: undefined };
}

module.exports = { parsePaginationParams };
