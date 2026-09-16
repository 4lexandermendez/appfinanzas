const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, crear, actualizar, eliminar, pagar, abonar, resumenPago, pendienteApartar, apartarAhora } = require("../controllers/tarjetaController");
const movimientos = require("../controllers/movimientoTarjetaController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.get("/resumen-pago", resumenPago);
router.get("/pendiente-apartar", pendienteApartar);
router.post("/apartar-ahora", apartarAhora);
router.post("/", crear);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);
router.post("/:id/pagar", pagar);
router.post("/:id/abonar", abonar);

router.get("/:tarjetaId/movimientos", movimientos.listar);
router.post("/:tarjetaId/movimientos", movimientos.crear);
router.patch("/:tarjetaId/movimientos/:id", movimientos.actualizar);
router.delete("/:tarjetaId/movimientos/:id", movimientos.eliminar);

module.exports = router;
