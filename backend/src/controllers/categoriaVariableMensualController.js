const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");
const { listarCategorias } = require("../services/categoriaService");

async function listar(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const categorias = await listarCategorias(req.usuarioId);
  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  const registros = presupuesto
    ? await prisma.categoriaVariableMensual.findMany({ where: { presupuestoId: presupuesto.id } })
    : [];
  const porCategoria = new Map(registros.map((r) => [r.categoriaId, r.montoEstimado]));

  const resultado = categorias.map((c) => ({
    categoriaId: c.id,
    nombre: c.nombre,
    esDefault: c.esDefault,
    montoEstimado: porCategoria.has(c.id) ? porCategoria.get(c.id) : null,
  }));

  res.json({ categorias: resultado });
}

async function guardar(req, res) {
  const { categoriaId, anio, mes, montoEstimado } = req.body;

  if (!categoriaId || !anio || !mes || montoEstimado === undefined) {
    return res.status(400).json({ error: "categoriaId, anio, mes y montoEstimado son requeridos" });
  }
  const montoNum = Number(montoEstimado);
  if (!Number.isFinite(montoNum) || montoNum < 0) {
    return res.status(400).json({ error: "montoEstimado debe ser un número mayor o igual a 0" });
  }

  const categoria = await prisma.categoriaVariable.findUnique({ where: { id: Number(categoriaId) } });
  if (!categoria || categoria.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  const registro = await prisma.categoriaVariableMensual.upsert({
    where: { presupuestoId_categoriaId: { presupuestoId: presupuesto.id, categoriaId: categoria.id } },
    update: { montoEstimado: montoNum },
    create: { presupuestoId: presupuesto.id, categoriaId: categoria.id, montoEstimado: montoNum },
  });

  res.json({ registro });
}

module.exports = { listar, guardar };
