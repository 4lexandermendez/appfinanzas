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
      include: { aportesExternos: true },
    }),
    prisma.trackerDiario.findMany({
      where: { presupuestoId: presupuesto.id, fecha: { gte: inicioDia, lt: finDia } },
    }),
  ]);

  // Los aportes externos (plata que puso otra persona) no cuentan como
  // gastado por el usuario, aunque el registro sea por el monto completo.
  const totalTransacciones = redondear(
    transacciones.reduce((s, t) => s + Number(t.monto) - t.aportesExternos.reduce((sa, a) => sa + Number(a.monto), 0), 0)
  );
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

// Saldo (ingresos.real - gastado) sumado de TODOS los meses con presupuesto,
// no solo el actual. El Saldo del mes se reinicia cada dia 1, pero la plata
// real en las cuentas es acumulada de siempre — comparar el Saldo mensual
// contra el saldo real de las cuentas da una diferencia enorme y enganosa.
// Reusa calcularResumenMes mes a mes para garantizar la misma formula que
// ya se ve en pantalla, en vez de duplicar la logica.
async function saldoAcumulado(req, res) {
  const presupuestos = await prisma.presupuestoMensual.findMany({
    where: { usuarioId: req.usuarioId },
    select: { anio: true, mes: true },
  });

  let total = 0;
  for (const { anio, mes } of presupuestos) {
    const r = await calcularResumenMes(req.usuarioId, anio, mes);
    const gastado = r.ahorros.real + r.gastosFijos.real + r.gastosVariables.real + r.deudas.real;
    total += r.ingresos.real - gastado;
  }

  res.json({ saldoAcumulado: redondear(total) });
}

module.exports = { hoy, resumenMes, resumenAnualCompleto, saldoAcumulado };
