const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

async function listarConfig(req, res) {
  const config = await prisma.gastoFijoConfig.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  res.json({ gastosFijos: config });
}

async function crearConfig(req, res) {
  const { nombre, montoEstimado } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const montoNum = Number(montoEstimado);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
  }

  const gastoFijo = await prisma.gastoFijoConfig.create({
    data: { usuarioId: req.usuarioId, nombre: nombre.trim(), montoEstimado: montoNum, activo: true },
  });
  res.status(201).json({ gastoFijo });
}

async function actualizarConfig(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.gastoFijoConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  const { nombre, montoEstimado, activo } = req.body;
  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (montoEstimado !== undefined) {
    const montoNum = Number(montoEstimado);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
    }
    data.montoEstimado = montoNum;
  }
  if (activo !== undefined) {
    if (typeof activo !== "boolean") return res.status(400).json({ error: "activo debe ser true o false" });
    data.activo = activo;
  }

  const gastoFijo = await prisma.gastoFijoConfig.update({ where: { id }, data });
  res.json({ gastoFijo });
}

async function eliminarConfig(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.gastoFijoConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  await prisma.gastoFijoConfig.delete({ where: { id } });
  res.status(204).send();
}

async function listarMensual(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const config = await prisma.gastoFijoConfig.findMany({
    where: { usuarioId: req.usuarioId, activo: true },
    orderBy: { nombre: "asc" },
  });

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  const registrosMensuales = presupuesto
    ? await prisma.gastoFijoMensual.findMany({ where: { presupuestoId: presupuesto.id } })
    : [];
  const realPorConfig = new Map(registrosMensuales.map((r) => [r.gastoFijoConfigId, r.montoReal]));

  const gastosFijos = config.map((c) => ({
    gastoFijoConfigId: c.id,
    nombre: c.nombre,
    montoEstimado: c.montoEstimado,
    montoReal: realPorConfig.has(c.id) ? realPorConfig.get(c.id) : null,
  }));

  res.json({ gastosFijos });
}

async function guardarMensual(req, res) {
  const { gastoFijoConfigId, anio, mes, montoReal } = req.body;

  if (!gastoFijoConfigId || !anio || !mes) {
    return res.status(400).json({ error: "gastoFijoConfigId, anio y mes son requeridos" });
  }
  const montoNum = Number(montoReal);
  if (!Number.isFinite(montoNum) || montoNum < 0) {
    return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
  }

  const config = await prisma.gastoFijoConfig.findUnique({ where: { id: Number(gastoFijoConfigId) } });
  if (!config || config.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  const registro = await prisma.gastoFijoMensual.upsert({
    where: { presupuestoId_gastoFijoConfigId: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id } },
    update: { montoReal: montoNum },
    create: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id, montoReal: montoNum },
  });

  res.json({ registro });
}

module.exports = { listarConfig, crearConfig, actualizarConfig, eliminarConfig, listarMensual, guardarMensual };
