const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

async function listar(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  if (!presupuesto) return res.json({ ahorros: [] });

  const ahorros = await prisma.ahorro.findMany({
    where: { presupuestoId: presupuesto.id },
    orderBy: { id: "asc" },
  });
  res.json({ ahorros });
}

async function crear(req, res) {
  const { anio, mes, nombre, montoEstimado, montoReal } = req.body;

  if (!anio || !mes || !nombre || !nombre.trim() || montoEstimado === undefined) {
    return res.status(400).json({ error: "anio, mes, nombre y montoEstimado son requeridos" });
  }
  const estimadoNum = Number(montoEstimado);
  if (!Number.isFinite(estimadoNum) || estimadoNum <= 0) {
    return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
  }
  let realNum = null;
  if (montoReal !== undefined && montoReal !== null) {
    realNum = Number(montoReal);
    if (!Number.isFinite(realNum) || realNum < 0) {
      return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
    }
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  const ahorro = await prisma.ahorro.create({
    data: {
      presupuestoId: presupuesto.id,
      nombre: nombre.trim(),
      montoEstimado: estimadoNum,
      montoReal: realNum,
    },
  });
  res.status(201).json({ ahorro });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.ahorro.findUnique({ where: { id }, include: { presupuesto: true } });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Ahorro no encontrado" });
  }

  const { nombre, montoEstimado, montoReal } = req.body;
  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (montoEstimado !== undefined) {
    const estimadoNum = Number(montoEstimado);
    if (!Number.isFinite(estimadoNum) || estimadoNum <= 0) {
      return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
    }
    data.montoEstimado = estimadoNum;
  }
  if (montoReal !== undefined) {
    if (montoReal === null) {
      data.montoReal = null;
    } else {
      const realNum = Number(montoReal);
      if (!Number.isFinite(realNum) || realNum < 0) {
        return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
      }
      data.montoReal = realNum;
    }
  }

  const ahorro = await prisma.ahorro.update({ where: { id }, data });
  res.json({ ahorro });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.ahorro.findUnique({ where: { id }, include: { presupuesto: true } });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Ahorro no encontrado" });
  }

  await prisma.ahorro.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
