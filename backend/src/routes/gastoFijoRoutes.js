const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const {
  listarConfig,
  crearConfig,
  actualizarConfig,
  eliminarConfig,
  listarMensual,
  guardarMensual,
  eliminarMensual,
} = require("../controllers/gastoFijoController");

const router = Router();
router.use(requiereAuth);

router.get("/mensual", listarMensual);
router.put("/mensual", guardarMensual);
router.delete("/mensual/:gastoFijoConfigId", eliminarMensual);
router.get("/", listarConfig);
router.post("/", crearConfig);
router.put("/:id", actualizarConfig);
router.delete("/:id", eliminarConfig);

module.exports = router;
