const prisma = require("../lib/prisma");

const CONCEPTOS_VALIDOS = ["PASAJE_IDA", "DESAYUNO", "ALMUERZO", "PASAJE_REGRESO"];

async function listar(req, res) {
  const montos = await prisma.montoRapido.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: [{ concepto: "asc" }, { monto: "asc" }],
  });
  res.json({ montos });
}

async function crear(req, res) {
  const { concepto, monto } = req.body;

  if (!CONCEPTOS_VALIDOS.includes(concepto)) {
    return res.status(400).json({ error: `concepto debe ser uno de: ${CONCEPTOS_VALIDOS.join(", ")}` });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "monto debe ser un número mayor a 0" });
  }

  try {
    const creado = await prisma.montoRapido.create({
      data: { usuarioId: req.usuarioId, concepto, monto: montoNum },
    });
    res.status(201).json({ monto: creado });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Ese monto ya está agregado para este concepto" });
    }
    throw err;
  }
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.montoRapido.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Monto no encontrado" });
  }

  await prisma.montoRapido.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, eliminar };
