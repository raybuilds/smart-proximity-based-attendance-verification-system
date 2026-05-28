const express = require("express");

const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");
const qrController = require("./qr.controller");

const router = express.Router();

router.use(authenticate, requireRole(ROLES.TEACHER));

router.get("/current/:sessionId", qrController.getCurrentQr);

module.exports = router;
