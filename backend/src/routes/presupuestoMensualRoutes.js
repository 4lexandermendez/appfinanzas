const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { obtenerNotas, guardarNotas } = require("../controllers/presupuestoMensualController");

const router = Router();
router.use(requiereAuth);

router.get("/notas", obtenerNotas);
router.put("/notas", guardarNotas);

module.exports = router;
