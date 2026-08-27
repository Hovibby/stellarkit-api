const express = require("express");
const router = express.Router();
const { success } = require("../utils/response");

router.get("/", (req, res) => {
  return success(res, { items: [], total: 0 });
});

module.exports = router;
