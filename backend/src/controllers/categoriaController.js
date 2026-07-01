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

module.exports = { listar, crear };
