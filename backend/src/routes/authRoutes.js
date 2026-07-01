const { Router } = require("express");
const { registrar, login, perfil } = require("../controllers/authController");
const { requiereAuth } = require("../middlewares/authMiddleware");

const router = Router();

router.post("/registro", registrar);
router.post("/login", login);
router.get("/me", requiereAuth, perfil);

module.exports = router;
