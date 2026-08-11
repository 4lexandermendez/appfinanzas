const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

async function listarConfig(req, res) {
  const deudas = await prisma.deudaConfig.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  res.json({ deudas });
}

async function crearConfig(req, res) {
  const { nombre, saldoActual } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  let saldoNum = 0;
  if (saldoActual !== undefined) {
    saldoNum = Number(saldoActual);
    if (!Number.isFinite(saldoNum) || saldoNum < 0) {
      return res.status(400).json({ error: "saldoActual debe ser un número mayor o igual a 0" });
    }
  }

  const deuda = await prisma.deudaConfig.create({
    data: { usuarioId: req.usuarioId, nombre: nombre.trim(), saldoActual: saldoNum, activo: true },
  });
  res.status(201).json({ deuda });
}

async function actualizarConfig(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.deudaConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Deuda no encontrada" });
  }

  const { nombre, activo } = req.body;
  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (activo !== undefined) {
    if (typeof activo !== "boolean") return res.status(400).json({ error: "activo debe ser true o false" });
    data.activo = activo;
    data.desactivadoEn = activo ? null : new Date();
  }

  const deuda = await prisma.deudaConfig.update({ where: { id }, data });
  res.json({ deuda });
}

async function eliminarConfig(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.deudaConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Deuda no encontrada" });
  }

  await prisma.deudaConfig.delete({ where: { id } });
  res.status(204).send();
}

async function listarMensual(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const configTodos = await prisma.deudaConfig.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: { nombre: "asc" },
  });
  // Una deuda ya saldada (saldoActual en 0) no tiene nada mas que pagar, asi
  // que desaparece sola en vez de tener que deshabilitarla a mano.
  const config = configTodos.filter((c) => Number(c.saldoActual) > 0);

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  const registrosMensuales = presupuesto
    ? await prisma.deudaMensual.findMany({ where: { presupuestoId: presupuesto.id } })
    : [];
  const porConfig = new Map(registrosMensuales.map((r) => [r.deudaConfigId, r]));

  const deudas = config.map((c) => {
    const registro = porConfig.get(c.id);
    return {
      id: c.id,
      deudaConfigId: c.id,
      nombre: c.nombre,
      activo: c.activo,
      creadoEn: c.creadoEn,
      desactivadoEn: c.desactivadoEn,
      // Si todavia no se guardo un estimado propio para este mes, se
      // sugiere el saldo pendiente actual (lo que falta de pagar) para que
      // el mes siguiente ya traiga automaticamente lo que quedo debiendo,
      // en vez de arrancar vacio cada vez.
      montoEstimado: Number(registro?.montoEstimado ?? c.saldoActual),
      montoReal: registro?.montoReal ?? null,
      actual: c.saldoActual,
    };
  });

  res.json({ deudas });
}

// Al guardar el Real del mes, el saldo pendiente (Actual) de la deuda baja
// por el monto pagado (delta contra lo que ya estaba registrado ese mes).
async function guardarMensual(req, res) {
  const { deudaConfigId, anio, mes, montoEstimado, montoReal } = req.body;

  if (!deudaConfigId || !anio || !mes) {
    return res.status(400).json({ error: "deudaConfigId, anio y mes son requeridos" });
  }

  const config = await prisma.deudaConfig.findUnique({ where: { id: Number(deudaConfigId) } });
  if (!config || config.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Deuda no encontrada" });
  }

  let estimadoNum = null;
  if (montoEstimado !== undefined && montoEstimado !== null) {
    estimadoNum = Number(montoEstimado);
    if (!Number.isFinite(estimadoNum) || estimadoNum < 0) {
      return res.status(400).json({ error: "montoEstimado debe ser un número mayor o igual a 0" });
    }
  }
  let realNum = null;
  if (montoReal !== undefined && montoReal !== null) {
    realNum = Number(montoReal);
    if (!Number.isFinite(realNum) || realNum < 0) {
      return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
    }
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  const existente = await prisma.deudaMensual.findUnique({
    where: { presupuestoId_deudaConfigId: { presupuestoId: presupuesto.id, deudaConfigId: config.id } },
  });
  const realAnterior = existente?.montoReal ? Number(existente.montoReal) : 0;
  const realNuevo = realNum ?? realAnterior;
  const deltaPago = realNuevo - realAnterior;

  const data = {};
  if (estimadoNum !== null) data.montoEstimado = estimadoNum;
  if (realNum !== null) data.montoReal = realNum;

  const [registro] = await prisma.$transaction([
    prisma.deudaMensual.upsert({
      where: { presupuestoId_deudaConfigId: { presupuestoId: presupuesto.id, deudaConfigId: config.id } },
      update: data,
      create: { presupuestoId: presupuesto.id, deudaConfigId: config.id, ...data },
    }),
    prisma.deudaConfig.update({
      where: { id: config.id },
      data: { saldoActual: { decrement: deltaPago } },
    }),
  ]);

  res.json({ registro });
}

module.exports = { listarConfig, crearConfig, actualizarConfig, eliminarConfig, listarMensual, guardarMensual };
