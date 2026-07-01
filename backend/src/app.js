const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const transaccionRoutes = require("./routes/transaccionRoutes");
const ajusteTrackerRoutes = require("./routes/ajusteTrackerRoutes");
const diaLibreRoutes = require("./routes/diaLibreRoutes");
const trackerRoutes = require("./routes/trackerRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/transacciones", transaccionRoutes);
app.use("/api/ajustes-tracker", ajusteTrackerRoutes);
app.use("/api/dias-libres", diaLibreRoutes);
app.use("/api/tracker", trackerRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Express 5 reenvía automáticamente los rechazos de promesas de las rutas async aquí.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;
