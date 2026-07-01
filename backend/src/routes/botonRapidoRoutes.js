const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, guardar, eliminar } = require("../controllers/botonRapidoController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.put("/", guardar);
router.delete("/:id", eliminar);

module.exports = router;
