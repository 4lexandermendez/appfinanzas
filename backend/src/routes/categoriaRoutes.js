const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { listar, crear, eliminar } = require("../controllers/categoriaController");

const router = Router();
router.use(requiereAuth);

router.get("/", listar);
router.post("/", crear);
router.delete("/:id", eliminar);

module.exports = router;
