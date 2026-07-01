const prisma = require("../lib/prisma");

const CATEGORIAS_DEFAULT = ["Transporte", "Comida"];

async function asegurarCategoriasDefault(usuarioId) {
  for (const nombre of CATEGORIAS_DEFAULT) {
    await prisma.categoriaVariable.upsert({
      where: { usuarioId_nombre: { usuarioId, nombre } },
      update: {},
      create: { usuarioId, nombre, esDefault: true },
    });
  }
}

async function listarCategorias(usuarioId) {
  await asegurarCategoriasDefault(usuarioId);
  return prisma.categoriaVariable.findMany({
    where: { usuarioId },
    orderBy: [{ esDefault: "desc" }, { nombre: "asc" }],
  });
}

module.exports = { asegurarCategoriasDefault, listarCategorias };
