const prisma = require("../lib/prisma");

// porcentajeAlerta se reutiliza con dos significados según el tipo:
// - PRESUPUESTO_CATEGORIA / LIMITE_VARIABLES: porcentaje del presupuesto (80, 100...)
// - TARJETA_CORTE / TARJETA_PAGO: días de anticipación para avisar
// - RESUMEN_GENERAL: no usa el valor, solo el flag activo
const DEFAULTS = [
  { tipo: "PRESUPUESTO_CATEGORIA", porcentajeAlerta: 80 },
  { tipo: "LIMITE_VARIABLES", porcentajeAlerta: 100 },
  { tipo: "TARJETA_CORTE", porcentajeAlerta: 3 },
  { tipo: "TARJETA_PAGO", porcentajeAlerta: 3 },
  { tipo: "RESUMEN_GENERAL", porcentajeAlerta: null },
];

async function asegurarDefaults(usuarioId) {
  for (const config of DEFAULTS) {
    await prisma.alertaConfig.upsert({
      where: { usuarioId_tipo: { usuarioId, tipo: config.tipo } },
      update: {},
      create: { usuarioId, tipo: config.tipo, porcentajeAlerta: config.porcentajeAlerta, activo: true },
    });
  }
}

async function listarConfig(usuarioId) {
  await asegurarDefaults(usuarioId);
  return prisma.alertaConfig.findMany({ where: { usuarioId }, orderBy: { tipo: "asc" } });
}

module.exports = { DEFAULTS, asegurarDefaults, listarConfig };
