const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/user.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");

router.post("/", verifyToken, checkRole(["Admin"]), ctrl.createUser);
router.get("/", verifyToken, checkRole(["Admin"]), ctrl.getAllUsers);
router.get("/:id", verifyToken, checkRole(["Admin"]), ctrl.getUserById);
router.put("/:id", verifyToken, checkRole(["Admin"]), ctrl.updateUser);
router.delete("/:id", verifyToken, checkRole(["Admin"]), ctrl.deleteUser);

module.exports = router;