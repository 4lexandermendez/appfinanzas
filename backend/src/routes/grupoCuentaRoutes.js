const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const {
  listar,
  crear,
  actualizar,
  eliminar,
  mover,
  crearCuenta,
  actualizarCuenta,
  eliminarCuenta,
  configurarEfectivo,
} = require("../controllers/grupoCuentaController");
const {
  crearTarjetaDebito,
  eliminarTarjetaDebito,
  listarMovimientos,
  crearMovimiento,
  actualizarMovimiento,
  eliminarMovimiento,
  transferir,
} = require("../controllers/cuentaBancariaController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.post("/", crear);
router.post("/configurar-efectivo", configurarEfectivo);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);
router.post("/:id/mover", mover);

router.post("/:grupoId/cuentas", crearCuenta);
router.put("/cuentas/:id", actualizarCuenta);
router.delete("/cuentas/:id", eliminarCuenta);

router.post("/cuentas/:cuentaId/tarjeta-debito", crearTarjetaDebito);
router.delete("/cuentas/:cuentaId/tarjeta-debito", eliminarTarjetaDebito);
router.get("/cuentas/:cuentaId/movimientos", listarMovimientos);
router.post("/cuentas/:cuentaId/movimientos", crearMovimiento);
router.patch("/cuentas/:cuentaId/movimientos/:id", actualizarMovimiento);
router.delete("/cuentas/:cuentaId/movimientos/:id", eliminarMovimiento);
router.post("/cuentas/:cuentaId/transferencias", transferir);

module.exports = router;
