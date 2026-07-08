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
  const ajuste = await prisma.ajusteTracker.findFirst({
    where: { usuarioId: req.usuarioId },
    orderBy: { creadoEn: "desc" },
  });
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

  // Cada cambio crea una version nueva (vigente desde hoy en adelante) para
  // no afectar retroactivamente el estimado de los dias ya pasados del mes
  // — salvo que ya se haya guardado algo hoy mismo, en cuyo caso se
  // sobreescribe esa misma version en vez de crear una por cada click.
  const ultima = await prisma.ajusteTracker.findFirst({
    where: { usuarioId: req.usuarioId },
    orderBy: { creadoEn: "desc" },
  });

  const ahora = new Date();
  const inicioHoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));

  let ajuste;
  if (ultima && new Date(ultima.creadoEn) >= inicioHoy) {
    ajuste = await prisma.ajusteTracker.update({ where: { id: ultima.id }, data });
  } else {
    ajuste = await prisma.ajusteTracker.create({ data: { usuarioId: req.usuarioId, ...data } });
  }

  res.json({ ajuste });
}

module.exports = { obtener, guardar };
