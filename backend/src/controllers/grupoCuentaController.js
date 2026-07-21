const prisma = require("../lib/prisma");
const { calcularInfoTarjeta } = require("../services/tarjetaService");

async function listar(req, res) {
  const grupos = await prisma.grupoCuenta.findMany({
    where: { usuarioId: req.usuarioId },
    include: {
      cuentas: { orderBy: { id: "asc" }, include: { tarjetaDebito: true } },
      tarjetas: { orderBy: { id: "asc" } },
    },
    orderBy: { orden: "asc" },
  });
  res.json({
    grupos: grupos.map((g) => ({
      ...g,
      tarjetas: g.tarjetas.map((t) => ({ ...t, info: calcularInfoTarjeta(t) })),
    })),
  });
}

async function crear(req, res) {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const ultimo = await prisma.grupoCuenta.findFirst({
    where: { usuarioId: req.usuarioId },
    orderBy: { orden: "desc" },
  });
  const grupo = await prisma.grupoCuenta.create({
    data: { usuarioId: req.usuarioId, nombre: nombre.trim(), orden: (ultimo?.orden ?? 0) + 1 },
  });
  res.status(201).json({ grupo: { ...grupo, cuentas: [], tarjetas: [] } });
}

// Intercambia el "orden" del grupo con el del vecino inmediato (anterior si
// direccion es "arriba", siguiente si es "abajo"). Si no hay vecino en esa
// dirección (ya es el primero/último), no hace nada.
async function mover(req, res) {
  const id = Number(req.params.id);
  const grupo = await obtenerGrupoDelUsuario(id, req.usuarioId);
  if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

  const { direccion } = req.body;
  if (direccion !== "arriba" && direccion !== "abajo") {
    return res.status(400).json({ error: "direccion debe ser 'arriba' o 'abajo'" });
  }

  const vecino = await prisma.grupoCuenta.findFirst({
    where: {
      usuarioId: req.usuarioId,
      orden: direccion === "arriba" ? { lt: grupo.orden } : { gt: grupo.orden },
    },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });
  if (!vecino) return res.status(204).send();

  await prisma.$transaction([
    prisma.grupoCuenta.update({ where: { id: grupo.id }, data: { orden: vecino.orden } }),
    prisma.grupoCuenta.update({ where: { id: vecino.id }, data: { orden: grupo.orden } }),
  ]);

  res.status(204).send();
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.grupoCuenta.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Grupo no encontrado" });
  }
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const grupo = await prisma.grupoCuenta.update({ where: { id }, data: { nombre: nombre.trim() } });
  res.json({ grupo });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.grupoCuenta.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Grupo no encontrado" });
  }
  await prisma.grupoCuenta.delete({ where: { id } });
  res.status(204).send();
}

async function obtenerGrupoDelUsuario(grupoId, usuarioId) {
  const grupo = await prisma.grupoCuenta.findUnique({ where: { id: grupoId } });
  if (!grupo || grupo.usuarioId !== usuarioId) return null;
  return grupo;
}

async function crearCuenta(req, res) {
  const grupoId = Number(req.params.grupoId);
  const grupo = await obtenerGrupoDelUsuario(grupoId, req.usuarioId);
  if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const cuenta = await prisma.cuentaBancaria.create({ data: { grupoId, nombre: nombre.trim() } });
  res.status(201).json({ cuenta });
}

async function actualizarCuenta(req, res) {
  const id = Number(req.params.id);
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id }, include: { grupo: true } });
  if (!cuenta || cuenta.grupo.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Cuenta no encontrada" });
  }
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const actualizada = await prisma.cuentaBancaria.update({ where: { id }, data: { nombre: nombre.trim() } });
  res.json({ cuenta: actualizada });
}

async function eliminarCuenta(req, res) {
  const id = Number(req.params.id);
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id }, include: { grupo: true } });
  if (!cuenta || cuenta.grupo.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Cuenta no encontrada" });
  }
  await prisma.cuentaBancaria.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar, mover, crearCuenta, actualizarCuenta, eliminarCuenta };
