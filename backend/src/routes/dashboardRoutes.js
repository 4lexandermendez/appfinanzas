const { Router } = require("express");
const { requiereAuth } = require("../middlewares/authMiddleware");
const { hoy } = require("../controllers/dashboardController");

const router = Router();
router.use(requiereAuth);

router.get("/hoy", hoy);

module.exports = router;
