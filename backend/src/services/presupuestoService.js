const prisma = require("../lib/prisma");

async function obtenerOCrearPresupuesto(usuarioId, anio, mes) {
  return prisma.presupuestoMensual.upsert({
    where: { usuarioId_anio_mes: { usuarioId, anio, mes } },
    update: {},
    create: { usuarioId, anio, mes },
  });
}

module.exports = { obtenerOCrearPresupuesto };
