const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const {
  listarConfig,
  crearConfig,
  actualizarConfig,
  eliminarConfig,
  listarMensual,
  guardarMensual,
} = require("../controllers/deudaController");

const router = Router();
router.use(requiereAuth);

router.get("/mensual", listarMensual);
router.put("/mensual", guardarMensual);
router.get("/", listarConfig);
router.post("/", crearConfig);
router.put("/:id", actualizarConfig);
router.delete("/:id", eliminarConfig);

module.exports = router;
