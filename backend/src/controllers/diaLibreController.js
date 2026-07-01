const prisma = require("../lib/prisma");
const { parseFechaSoloDia } = require("../utils/fecha");

const MOTIVOS_VALIDOS = ["VACACION", "ASUETO", "DESCANSO", "OTRO"];

async function listar(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);

  const where = { usuarioId: req.usuarioId };
  if (anio && mes) {
    where.fecha = {
      gte: new Date(Date.UTC(anio, mes - 1, 1)),
      lt: new Date(Date.UTC(anio, mes, 1)),
    };
  }

  const diasLibres = await prisma.diaLibre.findMany({ where, orderBy: { fecha: "asc" } });
  res.json({ diasLibres });
}

async function crear(req, res) {
  const { fecha, motivo } = req.body;

  const fechaParsed = parseFechaSoloDia(fecha);
  if (!fechaParsed) {
    return res.status(400).json({ error: "fecha inválida" });
  }
  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return res.status(400).json({ error: `motivo debe ser uno de: ${MOTIVOS_VALIDOS.join(", ")}` });
  }

  const existente = await prisma.diaLibre.findUnique({
    where: { usuarioId_fecha: { usuarioId: req.usuarioId, fecha: fechaParsed } },
  });
  if (existente) {
    return res.status(409).json({ error: "Ese día ya está marcado como libre" });
  }

  const diaLibre = await prisma.diaLibre.create({
    data: { usuarioId: req.usuarioId, fecha: fechaParsed, motivo },
  });

  res.status(201).json({ diaLibre });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.diaLibre.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Día libre no encontrado" });
  }

  await prisma.diaLibre.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, eliminar };
