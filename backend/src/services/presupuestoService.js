const prisma = require("../lib/prisma");

// Dos requests concurrentes para el mismo mes (ej. guardar una pestaña de
// notas y crear otra casi al mismo tiempo) pueden pasar juntas por el
// upsert cuando el presupuesto de ese mes todavia no existe, y una de las
// dos choca contra la restriccion unica al crear. Se resuelve pidiendo el
// que ya quedo creado por la otra en vez de fallar.
async function obtenerOCrearPresupuesto(usuarioId, anio, mes) {
  try {
    return await prisma.presupuestoMensual.upsert({
      where: { usuarioId_anio_mes: { usuarioId, anio, mes } },
      update: {},
      create: { usuarioId, anio, mes },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return prisma.presupuestoMensual.findUniqueOrThrow({
        where: { usuarioId_anio_mes: { usuarioId, anio, mes } },
      });
    }
    throw err;
  }
}

module.exports = { obtenerOCrearPresupuesto };
