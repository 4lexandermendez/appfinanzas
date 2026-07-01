const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");

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

module.exports = { hoy };
