const express = require("express");
const router = express.Router();
const { success } = require("../utils/response");

router.get("/", (req, res) => success(res, {}));

module.exports = router;
