const prisma = require("../lib/prisma");

const CONCEPTOS_VALIDOS = ["PASAJE_IDA", "DESAYUNO", "ALMUERZO", "PASAJE_REGRESO"];

async function listar(req, res) {
  const botones = await prisma.botonRapidoConfig.findMany({ where: { usuarioId: req.usuarioId } });
  res.json({ botones });
}

async function guardar(req, res) {
  const { concepto, monto1, monto2, monto3 } = req.body;

  if (!CONCEPTOS_VALIDOS.includes(concepto)) {
    return res.status(400).json({ error: `concepto debe ser uno de: ${CONCEPTOS_VALIDOS.join(", ")}` });
  }
  const monto1Num = Number(monto1);
  if (!Number.isFinite(monto1Num) || monto1Num <= 0) {
    return res.status(400).json({ error: "monto1 debe ser un número mayor a 0" });
  }
  const monto2Num = monto2 !== undefined && monto2 !== null ? Number(monto2) : null;
  const monto3Num = monto3 !== undefined && monto3 !== null ? Number(monto3) : null;
  if (monto2Num !== null && (!Number.isFinite(monto2Num) || monto2Num <= 0)) {
    return res.status(400).json({ error: "monto2 debe ser un número mayor a 0" });
  }
  if (monto3Num !== null && (!Number.isFinite(monto3Num) || monto3Num <= 0)) {
    return res.status(400).json({ error: "monto3 debe ser un número mayor a 0" });
  }

  const data = { monto1: monto1Num, monto2: monto2Num, monto3: monto3Num };

  const boton = await prisma.botonRapidoConfig.upsert({
    where: { usuarioId_concepto: { usuarioId: req.usuarioId, concepto } },
    update: data,
    create: { usuarioId: req.usuarioId, concepto, ...data },
  });

  res.json({ boton });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.botonRapidoConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Configuración no encontrada" });
  }

  await prisma.botonRapidoConfig.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, guardar, eliminar };
