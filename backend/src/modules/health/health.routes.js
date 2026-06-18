const express = require("express");

const healthController = require("./health.controller");

const router = express.Router();

router.get("/", healthController.getHealthStatus);
router.get("/ready", healthController.getReadinessStatus);

module.exports = router;
