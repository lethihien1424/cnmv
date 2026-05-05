const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/address.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.post("/", verifyToken, ctrl.createAddress);
router.get("/", verifyToken, ctrl.getAddresses);

module.exports = router;