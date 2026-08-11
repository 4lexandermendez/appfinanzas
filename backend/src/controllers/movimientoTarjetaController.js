const prisma = require("../lib/prisma");

async function obtenerTarjetaPropia(tarjetaId, usuarioId) {
  const tarjeta = await prisma.tarjetaCredito.findUnique({ where: { id: tarjetaId } });
  return tarjeta && tarjeta.usuarioId === usuarioId ? tarjeta : null;
}

async function listar(req, res) {
  const tarjetaId = Number(req.params.tarjetaId);
  const tarjeta = await obtenerTarjetaPropia(tarjetaId, req.usuarioId);
  if (!tarjeta) return res.status(404).json({ error: "Tarjeta no encontrada" });

  const movimientos = await prisma.movimientoTarjeta.findMany({
    where: { tarjetaId },
    orderBy: { fecha: "desc" },
  });
  res.json({ movimientos });
}

// Convención: monto positivo = compra cargada (aumenta el saldo);
// monto negativo = pago/abono (disminuye el saldo).
async function crear(req, res) {
  const tarjetaId = Number(req.params.tarjetaId);
  const tarjeta = await obtenerTarjetaPropia(tarjetaId, req.usuarioId);
  if (!tarjeta) return res.status(404).json({ error: "Tarjeta no encontrada" });

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
    prisma.movimientoTarjeta.create({
      data: { tarjetaId, monto: montoNum, fecha: fechaParsed, descripcion: descripcion || null },
    }),
    prisma.tarjetaCredito.update({
      where: { id: tarjetaId },
      data: { saldoActual: { increment: montoNum } },
    }),
  ]);

  res.status(201).json({ movimiento });
}

async function actualizar(req, res) {
  const tarjetaId = Number(req.params.tarjetaId);
  const id = Number(req.params.id);
  const tarjeta = await obtenerTarjetaPropia(tarjetaId, req.usuarioId);
  if (!tarjeta) return res.status(404).json({ error: "Tarjeta no encontrada" });

  const movimiento = await prisma.movimientoTarjeta.findUnique({ where: { id } });
  if (!movimiento || movimiento.tarjetaId !== tarjetaId) {
    return res.status(404).json({ error: "Movimiento no encontrado" });
  }

  if (typeof req.body.revisado !== "boolean") {
    return res.status(400).json({ error: "revisado debe ser true o false" });
  }

  const actualizado = await prisma.movimientoTarjeta.update({
    where: { id },
    data: { revisado: req.body.revisado },
  });

  res.json({ movimiento: actualizado });
}

async function eliminar(req, res) {
  const tarjetaId = Number(req.params.tarjetaId);
  const id = Number(req.params.id);
  const tarjeta = await obtenerTarjetaPropia(tarjetaId, req.usuarioId);
  if (!tarjeta) return res.status(404).json({ error: "Tarjeta no encontrada" });

  const movimiento = await prisma.movimientoTarjeta.findUnique({ where: { id } });
  if (!movimiento || movimiento.tarjetaId !== tarjetaId) {
    return res.status(404).json({ error: "Movimiento no encontrado" });
  }

  await prisma.$transaction([
    prisma.movimientoTarjeta.delete({ where: { id } }),
    prisma.tarjetaCredito.update({
      where: { id: tarjetaId },
      data: { saldoActual: { decrement: Number(movimiento.monto) } },
    }),
  ]);

  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
