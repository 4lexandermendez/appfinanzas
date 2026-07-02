const prisma = require("../lib/prisma");

async function listar(req, res) {
  const metas = await prisma.metaAhorro.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: { id: "asc" },
  });
  res.json({ metas });
}

async function crear(req, res) {
  const { nombre, montoObjetivo, montoActual, fechaLimite } = req.body;

  if (!nombre || !nombre.trim() || montoObjetivo === undefined) {
    return res.status(400).json({ error: "nombre y montoObjetivo son requeridos" });
  }
  const objetivoNum = Number(montoObjetivo);
  if (!Number.isFinite(objetivoNum) || objetivoNum <= 0) {
    return res.status(400).json({ error: "montoObjetivo debe ser un número mayor a 0" });
  }
  let actualNum = 0;
  if (montoActual !== undefined) {
    actualNum = Number(montoActual);
    if (!Number.isFinite(actualNum) || actualNum < 0) {
      return res.status(400).json({ error: "montoActual debe ser un número mayor o igual a 0" });
    }
  }

  const meta = await prisma.metaAhorro.create({
    data: {
      usuarioId: req.usuarioId,
      nombre: nombre.trim(),
      montoObjetivo: objetivoNum,
      montoActual: actualNum,
      fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
    },
  });
  res.status(201).json({ meta });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.metaAhorro.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Meta no encontrada" });
  }

  const { nombre, montoObjetivo, montoActual, fechaLimite } = req.body;
  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (montoObjetivo !== undefined) {
    const objetivoNum = Number(montoObjetivo);
    if (!Number.isFinite(objetivoNum) || objetivoNum <= 0) {
      return res.status(400).json({ error: "montoObjetivo debe ser un número mayor a 0" });
    }
    data.montoObjetivo = objetivoNum;
  }
  if (montoActual !== undefined) {
    const actualNum = Number(montoActual);
    if (!Number.isFinite(actualNum) || actualNum < 0) {
      return res.status(400).json({ error: "montoActual debe ser un número mayor o igual a 0" });
    }
    data.montoActual = actualNum;
  }
  if (fechaLimite !== undefined) {
    data.fechaLimite = fechaLimite ? new Date(fechaLimite) : null;
  }

  const meta = await prisma.metaAhorro.update({ where: { id }, data });
  res.json({ meta });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.metaAhorro.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Meta no encontrada" });
  }

  await prisma.metaAhorro.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
