const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");
const { calcularResumenMes } = require("../services/resumenMensualService");
const { calcularResumenAnual } = require("../services/resumenAnualService");

async function hoy(req, res) {
  const ahora = new Date();
  const inicioDia = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const finDia = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 1));

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: {
      usuarioId_anio_mes: {
        usuarioId: req.usuarioId,
        anio: ahora.getUTCFullYear(),
        mes: ahora.getUTCMonth() + 1,
      },
    },
  });

  if (!presupuesto) {
    return res.json({ totalHoy: 0, transacciones: 0, tracker: 0 });
  }

  const [transacciones, registrosTracker] = await Promise.all([
    prisma.transaccion.findMany({
      where: { presupuestoId: presupuesto.id, fecha: { gte: inicioDia, lt: finDia } },
    }),
    prisma.trackerDiario.findMany({
      where: { presupuestoId: presupuesto.id, fecha: { gte: inicioDia, lt: finDia } },
    }),
  ]);

  const totalTransacciones = redondear(transacciones.reduce((s, t) => s + Number(t.monto), 0));
  const totalTracker = redondear(registrosTracker.reduce((s, t) => s + Number(t.monto), 0));

  res.json({
    totalHoy: redondear(totalTransacciones + totalTracker),
    transacciones: totalTransacciones,
    tracker: totalTracker,
  });
}

async function resumenMes(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }
  const resultado = await calcularResumenMes(req.usuarioId, anio, mes);
  res.json(resultado);
}

async function resumenAnual(req, res) {
  const anio = Number(req.query.anio);
  if (!anio) {
    return res.status(400).json({ error: "anio es requerido" });
  }
  const resultado = await calcularResumenAnual(req.usuarioId, anio);
  res.json(resultado);
}

module.exports = { hoy, resumenMes, resumenAnual };
