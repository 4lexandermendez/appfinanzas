const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, crear, actualizar, eliminar, pagar } = require("../controllers/tarjetaController");
const movimientos = require("../controllers/movimientoTarjetaController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.post("/", crear);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);
router.post("/:id/pagar", pagar);

router.get("/:tarjetaId/movimientos", movimientos.listar);
router.post("/:tarjetaId/movimientos", movimientos.crear);
router.delete("/:tarjetaId/movimientos/:id", movimientos.eliminar);

module.exports = router;
