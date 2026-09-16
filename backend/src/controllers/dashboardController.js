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

// Plata real (cuentas marcadas "Principal", ej. BAC + Efectivo) que ya
// habia el dia 1 del mes pedido, antes de cualquier ingreso/gasto de ese
// mes. El widget de Saldo lo usa como punto de partida en vez de arrancar
// de cero cada mes — asi, mientras no haya un apartado tardio o un
// prestamo de tarjeta sin reponer, Saldo y Real terminan coincidiendo.
async function realAlInicioMes(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));

  const cuentas = await prisma.cuentaBancaria.findMany({
    where: { grupo: { usuarioId: req.usuarioId }, esPrincipal: true },
    select: { id: true },
  });
  if (cuentas.length === 0) return res.json({ real: null });

  const movimientos = await prisma.movimientoCuenta.findMany({
    where: { cuentaId: { in: cuentas.map((c) => c.id) }, fecha: { lt: inicioMes } },
    select: { monto: true },
  });
  const real = redondear(movimientos.reduce((s, m) => s + Number(m.monto), 0));
  res.json({ real });
}

module.exports = { hoy, resumenMes, resumenAnualCompleto, realAlInicioMes };
