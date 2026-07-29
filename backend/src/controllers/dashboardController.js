const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");
const { calcularResumenMes } = require("../services/resumenMensualService");
const { calcularResumenAnualCompleto } = require("../services/resumenAnualCompletoService");
const { parseFechaSoloDia, hoyElSalvador } = require("../utils/fecha");

async function hoy(req, res) {
  const fecha = req.query.fecha ? parseFechaSoloDia(req.query.fecha) : null;
  const base = fecha || hoyElSalvador();
  const inicioDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const finDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 1));

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: {
      usuarioId_anio_mes: {
        usuarioId: req.usuarioId,
        anio: inicioDia.getUTCFullYear(),
        mes: inicioDia.getUTCMonth() + 1,
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

async function resumenAnualCompleto(req, res) {
  const anio = Number(req.query.anio);
  if (!anio) {
    return res.status(400).json({ error: "anio es requerido" });
  }
  const resultado = await calcularResumenAnualCompleto(req.usuarioId, anio);
  res.json(resultado);
}

module.exports = { hoy, resumenMes, resumenAnualCompleto };
