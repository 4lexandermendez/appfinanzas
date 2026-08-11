const prisma = require("../lib/prisma");
const { listarCategorias } = require("../services/categoriaService");

async function listar(req, res) {
  const categorias = await listarCategorias(req.usuarioId);
  res.json({ categorias });
}

async function crear(req, res) {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }

  const existente = await prisma.categoriaVariable.findUnique({
    where: { usuarioId_nombre: { usuarioId: req.usuarioId, nombre: nombre.trim() } },
  });
  if (existente) {
    return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
  }

  const categoria = await prisma.categoriaVariable.create({
    data: { usuarioId: req.usuarioId, nombre: nombre.trim(), esDefault: false },
  });
  res.status(201).json({ categoria });
}

// Borra la categoria entera, junto con TODO su historial: las transacciones
// de todos los meses (cascade) y los estimados mensuales guardados. Los
// movimientos de tarjeta ya registrados por esas transacciones NO se
// borran (quedan sin vincular, ver ON DELETE SET NULL), asi que el saldo
// real de la tarjeta no se ve afectado. Comida/Transporte no se pueden
// borrar porque son necesarias para el Tracker.
async function eliminar(req, res) {
  const id = Number(req.params.id);
  const categoria = await prisma.categoriaVariable.findUnique({ where: { id } });
  if (!categoria || categoria.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }
  if (categoria.esDefault) {
    return res.status(400).json({ error: "Comida y Transporte no se pueden eliminar" });
  }

  await prisma.categoriaVariable.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, eliminar };
