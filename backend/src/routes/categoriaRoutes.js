const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, crear } = require("../controllers/categoriaController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.post("/", crear);

module.exports = router;
