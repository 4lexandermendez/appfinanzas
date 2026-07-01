const prisma = require("../lib/prisma");
const { parseFechaSoloDia } = require("../utils/fecha");

const CAMPOS_MONTO = [
  "montoPasajeIda",
  "montoDesayuno",
  "montoAlmuerzo",
  "montoPasajeRegreso",
  "montoPasajeSabadoIda",
  "montoDesayunoSabado",
  "montoPasajeSabadoRegreso",
];

async function obtener(req, res) {
  const ajuste = await prisma.ajusteTracker.findUnique({ where: { usuarioId: req.usuarioId } });
  res.json({ ajuste });
}

async function guardar(req, res) {
  const body = req.body;

  for (const campo of CAMPOS_MONTO) {
    const valor = Number(body[campo]);
    if (!Number.isFinite(valor) || valor < 0) {
      return res.status(400).json({ error: `${campo} debe ser un número mayor o igual a 0` });
    }
  }

  const patronSabadoInicio = parseFechaSoloDia(body.patronSabadoInicio);
  if (!patronSabadoInicio) {
    return res.status(400).json({ error: "patronSabadoInicio inválido" });
  }
  if (patronSabadoInicio.getUTCDay() !== 6) {
    return res.status(400).json({ error: "patronSabadoInicio debe ser un día sábado" });
  }
  if (typeof body.patronSabadoPrimerDiaVa !== "boolean") {
    return res.status(400).json({ error: "patronSabadoPrimerDiaVa debe ser true o false" });
  }

  const data = {
    montoPasajeIda: Number(body.montoPasajeIda),
    montoDesayuno: Number(body.montoDesayuno),
    montoAlmuerzo: Number(body.montoAlmuerzo),
    montoPasajeRegreso: Number(body.montoPasajeRegreso),
    montoPasajeSabadoIda: Number(body.montoPasajeSabadoIda),
    montoDesayunoSabado: Number(body.montoDesayunoSabado),
    montoPasajeSabadoRegreso: Number(body.montoPasajeSabadoRegreso),
    patronSabadoInicio,
    patronSabadoPrimerDiaVa: body.patronSabadoPrimerDiaVa,
  };

  const ajuste = await prisma.ajusteTracker.upsert({
    where: { usuarioId: req.usuarioId },
    update: data,
    create: { usuarioId: req.usuarioId, ...data },
  });

  res.json({ ajuste });
}

module.exports = { obtener, guardar };
