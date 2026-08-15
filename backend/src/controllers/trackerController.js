const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");
const { obtenerCuentaEfectivo } = require("../services/cuentaEfectivoService");
const { calcularEstimadoMes } = require("../services/estimadoTrackerService");
const { calcularResumenReal } = require("../services/resumenTrackerService");
const { calcularDetalleQuincenal } = require("../services/quincenalService");
const { parseFechaSoloDia } = require("../utils/fecha");

const CONCEPTOS_VALIDOS = ["PASAJE_IDA", "DESAYUNO", "ALMUERZO", "PASAJE_REGRESO"];
const CONCEPTO_ETIQUETA = {
  PASAJE_IDA: "Pasaje ida",
  DESAYUNO: "Desayuno",
  ALMUERZO: "Almuerzo",
  PASAJE_REGRESO: "Pasaje regreso",
};

async function listar(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  if (!presupuesto) {
    return res.json({ registros: [] });
  }

  const registros = await prisma.trackerDiario.findMany({
    where: { presupuestoId: presupuesto.id },
    orderBy: { fecha: "asc" },
  });
  res.json({ registros });
}

async function crear(req, res) {
  const { fecha, concepto, monto } = req.body;

  const fechaParsed = parseFechaSoloDia(fecha);
  if (!fechaParsed) {
    return res.status(400).json({ error: "fecha inválida" });
  }
  if (!CONCEPTOS_VALIDOS.includes(concepto)) {
    return res.status(400).json({ error: `concepto debe ser uno de: ${CONCEPTOS_VALIDOS.join(", ")}` });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum < 0) {
    return res.status(400).json({ error: "monto debe ser un número mayor o igual a 0" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(
    req.usuarioId,
    fechaParsed.getUTCFullYear(),
    fechaParsed.getUTCMonth() + 1
  );

  // Pasaje/desayuno/almuerzo son siempre en efectivo por naturaleza (no
  // llevan selector de fuente) — si el usuario ya tiene una billetera
  // configurada, cada registro descuenta sola de ahí, en paralelo al "Real"
  // de Comida/Transporte que ya se calculaba antes (sin tocar ese cálculo).
  const cuentaEfectivo = await obtenerCuentaEfectivo(req.usuarioId);

  const registro = await prisma.$transaction(async (tx) => {
    const creado = await tx.trackerDiario.create({
      data: { presupuestoId: presupuesto.id, fecha: fechaParsed, concepto, monto: montoNum },
    });

    if (cuentaEfectivo && montoNum > 0) {
      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuentaEfectivo.id,
          monto: -montoNum,
          fecha: fechaParsed,
          descripcion: CONCEPTO_ETIQUETA[concepto],
          trackerDiarioId: creado.id,
        },
      });
      await tx.cuentaBancaria.update({
        where: { id: cuentaEfectivo.id },
        data: { saldoActual: { decrement: montoNum } },
      });
    }

    return creado;
  }, { timeout: 15000 });

  res.status(201).json({ registro });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.trackerDiario.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoCuenta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Registro no encontrado" });
  }

  await prisma.$transaction(async (tx) => {
    if (existente.movimientoCuenta) {
      await tx.movimientoCuenta.delete({ where: { id: existente.movimientoCuenta.id } });
      await tx.cuentaBancaria.update({
        where: { id: existente.movimientoCuenta.cuentaId },
        data: { saldoActual: { decrement: Number(existente.movimientoCuenta.monto) } },
      });
    }
    await tx.trackerDiario.delete({ where: { id } });
  }, { timeout: 15000 });

  res.status(204).send();
}

async function estimado(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const resultado = await calcularEstimadoMes(req.usuarioId, anio, mes);
  if (!resultado) {
    return res.status(400).json({ error: "Primero debes configurar Ajustes del Tracker (PUT /api/ajustes-tracker)" });
  }
  res.json(resultado);
}

async function resumen(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const resultado = await calcularResumenReal(req.usuarioId, anio, mes);
  res.json(resultado);
}

async function quincenal(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const resultado = await calcularDetalleQuincenal(req.usuarioId, anio, mes);
  if (!resultado) {
    return res.status(400).json({ error: "Primero debes configurar Ajustes del Tracker (PUT /api/ajustes-tracker)" });
  }
  res.json(resultado);
}

module.exports = { listar, crear, eliminar, estimado, resumen, quincenal };
