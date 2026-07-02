const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, guardar } = require("../controllers/categoriaVariableMensualController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.put("/", guardar);

module.exports = router;
