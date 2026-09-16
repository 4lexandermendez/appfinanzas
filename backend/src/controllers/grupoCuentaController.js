const prisma = require("../lib/prisma");
const { calcularInfoTarjeta, calcularMontoCicloVencido } = require("../services/tarjetaService");
const { obtenerCuentaEfectivo } = require("../services/cuentaEfectivoService");

async function listar(req, res) {
  const grupos = await prisma.grupoCuenta.findMany({
    where: { usuarioId: req.usuarioId },
    include: {
      cuentas: { orderBy: { id: "asc" }, include: { tarjetaDebito: true } },
      tarjetas: { orderBy: { id: "asc" } },
    },
    orderBy: { orden: "asc" },
  });

  const todasLasTarjetas = grupos.flatMap((g) => g.tarjetas);
  const movimientos = todasLasTarjetas.length
    ? await prisma.movimientoTarjeta.findMany({
        where: { tarjetaId: { in: todasLasTarjetas.map((t) => t.id) } },
        orderBy: { id: "asc" },
      })
    : [];
  const movimientosPorTarjeta = new Map();
  for (const m of movimientos) {
    if (!movimientosPorTarjeta.has(m.tarjetaId)) movimientosPorTarjeta.set(m.tarjetaId, []);
    movimientosPorTarjeta.get(m.tarjetaId).push(m);
  }

  res.json({
    grupos: grupos.map((g) => ({
      ...g,
      tarjetas: g.tarjetas.map((t) => {
        const info = calcularInfoTarjeta(t);
        // Lo que de verdad hay que pagar ahora (ciclo ya cortado) — ver
        // tarjetaController.listar, es el mismo calculo replicado aca
        // porque esta pantalla (Cuentas) arma la grilla desde este
        // endpoint, no desde /api/tarjetas.
        info.montoCicloVencido = calcularMontoCicloVencido(movimientosPorTarjeta.get(t.id) || [], info.ciclo);
        return { ...t, info };
      }),
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
  const existente = await prisma.grupoCuenta.findUnique({ where: { id }, include: { cuentas: true } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Grupo no encontrado" });
  }
  // Igual que en eliminarCuenta: no se deja borrar en cascada un grupo que
  // contenga la cuenta de Efectivo, para no perder su historial por
  // accidente al borrar el grupo entero.
  if (existente.cuentas.some((c) => c.esEfectivo)) {
    return res.status(400).json({ error: "Este grupo contiene tu cuenta de Efectivo — no se puede eliminar así" });
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
  const { nombre, esPrincipal } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const data = { nombre: nombre.trim() };
  if (typeof esPrincipal === "boolean") data.esPrincipal = esPrincipal;
  const actualizada = await prisma.cuentaBancaria.update({ where: { id }, data });
  res.json({ cuenta: actualizada });
}

async function eliminarCuenta(req, res) {
  const id = Number(req.params.id);
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id }, include: { grupo: true } });
  if (!cuenta || cuenta.grupo.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Cuenta no encontrada" });
  }
  // Igual que las categorías esDefault: no se deja borrar la billetera de
  // efectivo por accidente, ya que se llevaría todo su historial de
  // movimientos vinculados (gastos en efectivo, ingresos, pagos de tarjeta).
  if (cuenta.esEfectivo) {
    return res.status(400).json({ error: "No se puede eliminar la cuenta de Efectivo" });
  }
  await prisma.cuentaBancaria.delete({ where: { id } });
  res.status(204).send();
}

// Crea de una sola vez el grupo + cuenta que representan la billetera fisica
// de efectivo del usuario ("Configurar mi Efectivo"). Solo puede haber una
// por usuario.
async function configurarEfectivo(req, res) {
  const existente = await obtenerCuentaEfectivo(req.usuarioId);
  if (existente) {
    return res.status(400).json({ error: "Ya tenés una cuenta de Efectivo configurada" });
  }

  const ultimo = await prisma.grupoCuenta.findFirst({
    where: { usuarioId: req.usuarioId },
    orderBy: { orden: "desc" },
  });

  const grupo = await prisma.$transaction(async (tx) => {
    const nuevoGrupo = await tx.grupoCuenta.create({
      data: { usuarioId: req.usuarioId, nombre: "Efectivo", orden: (ultimo?.orden ?? 0) + 1 },
    });
    const cuenta = await tx.cuentaBancaria.create({
      data: { grupoId: nuevoGrupo.id, nombre: "Billetera Efectivo", esEfectivo: true },
    });
    return { ...nuevoGrupo, cuentas: [cuenta], tarjetas: [] };
  }, { timeout: 15000 });

  res.status(201).json({ grupo });
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar,
  mover,
  crearCuenta,
  actualizarCuenta,
  eliminarCuenta,
  configurarEfectivo,
};
