const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, crear, actualizar, eliminar } = require("../controllers/ahorroController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.post("/", crear);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);

module.exports = router;
