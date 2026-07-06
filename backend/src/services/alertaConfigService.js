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

// Antes se llamaba a upsert() una vez por cada tipo (5 ida-y-vuelta a la DB,
// siempre, en cada llamada). Ahora se pide la lista una sola vez y solo se
// crean en batch los tipos que de verdad faltan, así que en el caso normal
// (ya existen los 5) esto es una sola consulta.
async function asegurarDefaults(usuarioId, configsExistentes) {
  const existentes = new Set(configsExistentes.map((c) => c.tipo));
  const faltantes = DEFAULTS.filter((d) => !existentes.has(d.tipo));
  if (faltantes.length === 0) return false;

  await prisma.alertaConfig.createMany({
    data: faltantes.map((d) => ({ usuarioId, tipo: d.tipo, porcentajeAlerta: d.porcentajeAlerta, activo: true })),
    skipDuplicates: true,
  });
  return true;
}

async function listarConfig(usuarioId) {
  const configs = await prisma.alertaConfig.findMany({ where: { usuarioId }, orderBy: { tipo: "asc" } });
  if (configs.length >= DEFAULTS.length) return configs;

  const creoAlgo = await asegurarDefaults(usuarioId, configs);
  if (!creoAlgo) return configs;
  return prisma.alertaConfig.findMany({ where: { usuarioId }, orderBy: { tipo: "asc" } });
}

module.exports = { DEFAULTS, asegurarDefaults, listarConfig };
