const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listarConfiguracion, guardarConfiguracion, listarAlertas } = require("../controllers/alertaController");

const router = Router();
router.use(requiereAuth);

router.get("/", listarAlertas);
router.get("/config", listarConfiguracion);
router.put("/config", guardarConfiguracion);

module.exports = router;
