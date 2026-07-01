const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { obtener, guardar } = require("../controllers/ajusteTrackerController");

const router = Router();
router.use(requiereAuth);

router.get("/", obtener);
router.put("/", guardar);

module.exports = router;
