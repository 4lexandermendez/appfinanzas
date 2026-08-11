const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");
const { listarCategorias } = require("../services/categoriaService");
const { redondear } = require("../utils/dinero");

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
  const [registros, transacciones] = await Promise.all([
    presupuesto
      ? prisma.categoriaVariableMensual.findMany({ where: { presupuestoId: presupuesto.id } })
      : [],
    presupuesto
      ? prisma.transaccion.findMany({ where: { presupuestoId: presupuesto.id }, include: { aportesExternos: true } })
      : [],
  ]);
  const porCategoria = new Map(registros.map((r) => [r.categoriaId, r.montoEstimado]));
  const realPorCategoria = new Map();
  for (const t of transacciones) {
    const aportes = t.aportesExternos.reduce((s, a) => s + Number(a.monto), 0);
    const previo = realPorCategoria.get(t.categoriaId) || 0;
    realPorCategoria.set(t.categoriaId, previo + Number(t.monto) - aportes);
  }

  const resultado = categorias.map((c) => ({
    categoriaId: c.id,
    nombre: c.nombre,
    esDefault: c.esDefault,
    montoEstimado: porCategoria.has(c.id) ? porCategoria.get(c.id) : null,
    montoReal: redondear(realPorCategoria.get(c.id) || 0),
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

// Quita el estimado de ESTE mes (la categoria deja de "pertenecer" a este
// mes, ver el filtro perteneceAlMes del frontend) sin tocar la categoria en
// si ni sus transacciones — a diferencia de eliminar la categoria completa
// (ver categoriaController.eliminar), esto es reversible con solo volver a
// agregarle un estimado.
async function eliminarMensual(req, res) {
  const categoriaId = Number(req.params.categoriaId);
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const categoria = await prisma.categoriaVariable.findUnique({ where: { id: categoriaId } });
  if (!categoria || categoria.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  if (presupuesto) {
    await prisma.categoriaVariableMensual.deleteMany({
      where: { presupuestoId: presupuesto.id, categoriaId },
    });
  }

  res.status(204).send();
}

module.exports = { listar, guardar, eliminarMensual };
