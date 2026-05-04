const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/review.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");

router.post("/", verifyToken, checkRole(["Customer"]), ctrl.createReview);

module.exports = router;