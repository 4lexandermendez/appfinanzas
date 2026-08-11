const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, guardar, crear, eliminar } = require("../controllers/presupuestoMensualController");

const router = Router();
router.use(requiereAuth);

router.get("/notas", listar);
router.put("/notas", guardar);
router.post("/notas", crear);
router.delete("/notas/:id", eliminar);

module.exports = router;
