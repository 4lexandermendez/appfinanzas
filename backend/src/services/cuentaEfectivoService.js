const prisma = require("../lib/prisma");

function obtenerCuentaEfectivo(usuarioId) {
  return prisma.cuentaBancaria.findFirst({ where: { esEfectivo: true, grupo: { usuarioId } } });
}

async function validarCuentaPropia(usuarioId, cuentaId) {
  if (!cuentaId) return null;
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id: cuentaId }, include: { grupo: true } });
  return cuenta && cuenta.grupo.usuarioId === usuarioId ? cuenta : null;
}

module.exports = { obtenerCuentaEfectivo, validarCuentaPropia };
