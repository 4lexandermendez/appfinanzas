const prisma = require("../lib/prisma");
const { hoyElSalvador } = require("../utils/fecha");

async function obtenerCuentaPropia(cuentaId, usuarioId) {
  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id: cuentaId },
    include: { grupo: true },
  });
  return cuenta && cuenta.grupo.usuarioId === usuarioId ? cuenta : null;
}

async function crearTarjetaDebito(req, res) {
  const cuentaId = Number(req.params.cuentaId);
  const cuenta = await obtenerCuentaPropia(cuentaId, req.usuarioId);
  if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });

  const existente = await prisma.tarjetaDebito.findUnique({ where: { cuentaId } });
  if (existente) return res.status(400).json({ error: "Esta cuenta ya tiene una tarjeta de débito" });

  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const tarjeta = await prisma.tarjetaDebito.create({ data: { cuentaId, nombre: nombre.trim() } });
  res.status(201).json({ tarjeta });
}

async function eliminarTarjetaDebito(req, res) {
  const cuentaId = Number(req.params.cuentaId);
  const cuenta = await obtenerCuentaPropia(cuentaId, req.usuarioId);
  if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });

  const existente = await prisma.tarjetaDebito.findUnique({ where: { cuentaId } });
  if (!existente) return res.status(404).json({ error: "Esta cuenta no tiene tarjeta de débito" });

  await prisma.tarjetaDebito.delete({ where: { cuentaId } });
  res.status(204).send();
}

async function listarMovimientos(req, res) {
  const cuentaId = Number(req.params.cuentaId);
  const cuenta = await obtenerCuentaPropia(cuentaId, req.usuarioId);
  if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });

  const movimientos = await prisma.movimientoCuenta.findMany({
    where: { cuentaId },
    orderBy: { fecha: "desc" },
  });
  res.json({ movimientos });
}

// Convención: monto positivo = entrada (depósito); monto negativo = salida (retiro).
async function crearMovimiento(req, res) {
  const cuentaId = Number(req.params.cuentaId);
  const cuenta = await obtenerCuentaPropia(cuentaId, req.usuarioId);
  if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });

  const { monto, fecha, descripcion } = req.body;
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum === 0) {
    return res.status(400).json({ error: "monto debe ser un número distinto de 0" });
  }
  const fechaParsed = new Date(fecha);
  if (Number.isNaN(fechaParsed.getTime())) {
    return res.status(400).json({ error: "fecha inválida" });
  }

  const [movimiento] = await prisma.$transaction([
    prisma.movimientoCuenta.create({
      data: { cuentaId, monto: montoNum, fecha: fechaParsed, descripcion: descripcion || null },
    }),
    prisma.cuentaBancaria.update({
      where: { id: cuentaId },
      data: { saldoActual: { increment: montoNum } },
    }),
  ]);

  res.status(201).json({ movimiento });
}

async function eliminarMovimiento(req, res) {
  const cuentaId = Number(req.params.cuentaId);
  const id = Number(req.params.id);
  const cuenta = await obtenerCuentaPropia(cuentaId, req.usuarioId);
  if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });

  const movimiento = await prisma.movimientoCuenta.findUnique({ where: { id } });
  if (!movimiento || movimiento.cuentaId !== cuentaId) {
    return res.status(404).json({ error: "Movimiento no encontrado" });
  }

  await prisma.$transaction([
    prisma.movimientoCuenta.delete({ where: { id } }),
    prisma.cuentaBancaria.update({
      where: { id: cuentaId },
      data: { saldoActual: { decrement: Number(movimiento.monto) } },
    }),
  ]);

  res.status(204).send();
}

async function transferir(req, res) {
  const cuentaOrigenId = Number(req.params.cuentaId);
  const origen = await obtenerCuentaPropia(cuentaOrigenId, req.usuarioId);
  if (!origen) return res.status(404).json({ error: "Cuenta no encontrada" });

  const { cuentaDestinoId, monto, descripcion } = req.body;
  const cuentaDestinoIdNum = Number(cuentaDestinoId);
  if (!Number.isInteger(cuentaDestinoIdNum) || cuentaDestinoIdNum === cuentaOrigenId) {
    return res.status(400).json({ error: "cuentaDestinoId inválido" });
  }
  const destino = await obtenerCuentaPropia(cuentaDestinoIdNum, req.usuarioId);
  if (!destino) return res.status(400).json({ error: "Cuenta destino no encontrada" });

  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "monto debe ser un número mayor a 0" });
  }
  if (montoNum > Number(origen.saldoActual)) {
    return res.status(400).json({ error: "El monto supera el saldo disponible en la cuenta origen" });
  }

  const fechaHoy = hoyElSalvador();
  const notaExtra = descripcion ? ` (${descripcion})` : "";

  const [movimientoOrigen, movimientoDestino] = await prisma.$transaction([
    prisma.movimientoCuenta.create({
      data: {
        cuentaId: cuentaOrigenId,
        monto: -montoNum,
        fecha: fechaHoy,
        descripcion: `Transferencia a ${destino.nombre}${notaExtra}`,
      },
    }),
    prisma.movimientoCuenta.create({
      data: {
        cuentaId: cuentaDestinoIdNum,
        monto: montoNum,
        fecha: fechaHoy,
        descripcion: `Transferencia desde ${origen.nombre}${notaExtra}`,
      },
    }),
    prisma.cuentaBancaria.update({
      where: { id: cuentaOrigenId },
      data: { saldoActual: { decrement: montoNum } },
    }),
    prisma.cuentaBancaria.update({
      where: { id: cuentaDestinoIdNum },
      data: { saldoActual: { increment: montoNum } },
    }),
  ]);

  res.status(201).json({ movimientoOrigen, movimientoDestino });
}

module.exports = {
  crearTarjetaDebito,
  eliminarTarjetaDebito,
  listarMovimientos,
  crearMovimiento,
  eliminarMovimiento,
  transferir,
};
