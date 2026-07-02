const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, crear, eliminar, estimado, resumen, quincenal } = require("../controllers/trackerController");

const router = Router();
router.use(requiereAuth);

router.get("/estimado", estimado);
router.get("/resumen", resumen);
router.get("/quincenal", quincenal);
router.get("/", listar);
router.post("/", crear);
router.delete("/:id", eliminar);

module.exports = router;
