const prisma = require("../lib/prisma");

const CATEGORIAS_DEFAULT = ["Transporte", "Comida"];

// Antes hacia un upsert secuencial por categoria default — bajo llamadas
// concurrentes (ej. React StrictMode monta el efecto dos veces, o dos
// pestañas abiertas a la vez) dos upserts para el mismo (usuarioId, nombre)
// podian pisarse: el primero crea la fila, el segundo ya no la ve como
// existente todavia (no confirmada) e intenta crearla tambien, violando el
// unique constraint y tumbando el endpoint con 500. Ahora se revisa primero
// que categorias faltan y se crean todas de una con skipDuplicates, que en
// MySQL si es seguro ante llamadas concurrentes.
async function asegurarCategoriasDefault(usuarioId) {
  const existentes = await prisma.categoriaVariable.findMany({
    where: { usuarioId, nombre: { in: CATEGORIAS_DEFAULT } },
    select: { nombre: true },
  });
  const nombresExistentes = new Set(existentes.map((c) => c.nombre));
  const faltantes = CATEGORIAS_DEFAULT.filter((nombre) => !nombresExistentes.has(nombre));
  if (faltantes.length === 0) return;

  await prisma.categoriaVariable.createMany({
    data: faltantes.map((nombre) => ({ usuarioId, nombre, esDefault: true })),
    skipDuplicates: true,
  });
}

async function listarCategorias(usuarioId) {
  await asegurarCategoriasDefault(usuarioId);
  return prisma.categoriaVariable.findMany({
    where: { usuarioId },
    orderBy: [{ esDefault: "desc" }, { nombre: "asc" }],
  });
}

module.exports = { asegurarCategoriasDefault, listarCategorias };
