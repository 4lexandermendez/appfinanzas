const prisma = require("../lib/prisma");
const { listarConfig } = require("../services/alertaConfigService");
const { calcularAlertas } = require("../services/alertaService");

const TIPOS_VALIDOS = ["PRESUPUESTO_CATEGORIA", "LIMITE_VARIABLES", "TARJETA_CORTE", "TARJETA_PAGO", "RESUMEN_GENERAL"];

async function listarConfiguracion(req, res) {
  const config = await listarConfig(req.usuarioId);
  res.json({ alertasConfig: config });
}

async function guardarConfiguracion(req, res) {
  const { tipo, porcentajeAlerta, activo } = req.body;

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}` });
  }
  const data = {};
  if (porcentajeAlerta !== undefined) {
    if (porcentajeAlerta === null) {
      data.porcentajeAlerta = null;
    } else {
      const num = Number(porcentajeAlerta);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ error: "porcentajeAlerta debe ser un número mayor o igual a 0" });
      }
      data.porcentajeAlerta = num;
    }
  }
  if (activo !== undefined) {
    if (typeof activo !== "boolean") return res.status(400).json({ error: "activo debe ser true o false" });
    data.activo = activo;
  }

  const config = await prisma.alertaConfig.upsert({
    where: { usuarioId_tipo: { usuarioId: req.usuarioId, tipo } },
    update: data,
    create: { usuarioId: req.usuarioId, tipo, activo: true, ...data },
  });
  res.json({ alertaConfig: config });
}

async function listarAlertas(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }
  const alertas = await calcularAlertas(req.usuarioId, anio, mes);
  res.json({ alertas });
}

module.exports = { listarConfiguracion, guardarConfiguracion, listarAlertas };
