const prisma = require("../lib/prisma");

// Encuentra a que cuenta bancaria hay que apartarle la plata para pagar una
// tarjeta despues: la(s) cuenta(s) que estan en el mismo grupo (mismo banco)
// que la tarjeta. Si hay una sola, se usa esa sola; si hay varias (ej. el
// Agricola tiene Cuenta principal y Cuenta secundaria), hace falta que el
// que llama especifique cual con cuentaDestinoId.
async function resolverCuentaDestinoReserva(tarjetaId, cuentaDestinoId) {
  const tarjeta = await prisma.tarjetaCredito.findUnique({ where: { id: tarjetaId } });
  if (!tarjeta || !tarjeta.grupoId) {
    return { ok: false, error: "Esta tarjeta no tiene un banco/grupo asociado, no se puede apartar plata para ella" };
  }
  const cuentasDelGrupo = await prisma.cuentaBancaria.findMany({ where: { grupoId: tarjeta.grupoId } });

  if (cuentasDelGrupo.length === 0) {
    return { ok: false, error: "El banco de esta tarjeta no tiene ninguna cuenta registrada" };
  }
  if (cuentasDelGrupo.length === 1) {
    return { ok: true, cuenta: cuentasDelGrupo[0] };
  }
  if (!cuentaDestinoId) {
    return {
      ok: false,
      error: "Este banco tiene varias cuentas — especificá cuentaDestinoId",
      opciones: cuentasDelGrupo,
    };
  }
  const elegida = cuentasDelGrupo.find((c) => c.id === Number(cuentaDestinoId));
  if (!elegida) {
    return { ok: false, error: "cuentaDestinoId no pertenece al banco de esta tarjeta" };
  }
  return { ok: true, cuenta: elegida };
}

// Ejecuta la reserva dentro de una transaccion ya abierta (tx): resta de la
// cuenta origen y suma a la cuenta destino, igual que una transferencia
// normal — es literalmente el mismo paso manual que ya se hacia a mano
// ("Transferir" en Cuentas), solo que automatico al momento de registrar el
// gasto con tarjeta, para no tener que acordarse de hacerlo despues.
//
// vinculo (opcional): { transaccionId } o { gastoFijoMensualId } — vincula
// el movimiento de SALIDA (el de la cuenta origen) al gasto que lo origino,
// igual que ya se hace con el gasto pagado en efectivo. Esto es lo que le
// permite al sistema despues saber "a este gasto con tarjeta ya le aparte
// la plata" vs "todavia esta pendiente" (ver tarjetaController.pendienteApartar).
async function ejecutarReserva(tx, { cuentaOrigen, cuentaDestino, monto, descripcion, fecha, vinculo }) {
  await tx.movimientoCuenta.create({
    data: {
      cuentaId: cuentaOrigen.id,
      monto: -monto,
      fecha,
      descripcion: `Transferencia a ${cuentaDestino.nombre} (${descripcion})`,
      ...(vinculo || {}),
    },
  });
  await tx.movimientoCuenta.create({
    data: { cuentaId: cuentaDestino.id, monto, fecha, descripcion: `Transferencia desde ${cuentaOrigen.nombre} (${descripcion})` },
  });
  await tx.cuentaBancaria.update({ where: { id: cuentaOrigen.id }, data: { saldoActual: { decrement: monto } } });
  await tx.cuentaBancaria.update({ where: { id: cuentaDestino.id }, data: { saldoActual: { increment: monto } } });
}

module.exports = { resolverCuentaDestinoReserva, ejecutarReserva };
