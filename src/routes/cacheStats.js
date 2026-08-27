const express = require("express");
const router = express.Router();
const cacheService = require("../services/cache");
const { success } = require("../utils/response");

router.get("/stats", (req, res) => success(res, cacheService.getStats()));

module.exports = router;
