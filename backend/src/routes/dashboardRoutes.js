const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { hoy, resumenMes, resumenAnualCompleto, saldoAcumulado } = require("../controllers/dashboardController");

const router = Router();
router.use(requiereAuth);

router.get("/hoy", hoy);
router.get("/resumen-mes", resumenMes);
router.get("/resumen-anual-completo", resumenAnualCompleto);
router.get("/saldo-acumulado", saldoAcumulado);

module.exports = router;
