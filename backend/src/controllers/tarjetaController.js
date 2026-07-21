const prisma = require("../lib/prisma");
const { calcularInfoTarjeta } = require("../services/tarjetaService");

async function listar(req, res) {
  const tarjetas = await prisma.tarjetaCredito.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: { nombre: "asc" },
  });
  res.json({ tarjetas: tarjetas.map((t) => ({ ...t, info: calcularInfoTarjeta(t) })) });
}

function validarDia(valor, campo) {
  const num = Number(valor);
  return Number.isInteger(num) && num >= 1 && num <= 31 ? num : null;
}

async function validarGrupoId(grupoId, usuarioId) {
  if (grupoId === undefined || grupoId === null) return { ok: true, valor: null };
  const num = Number(grupoId);
  if (!Number.isInteger(num)) return { ok: false };
  const grupo = await prisma.grupoCuenta.findUnique({ where: { id: num } });
  if (!grupo || grupo.usuarioId !== usuarioId) return { ok: false };
  return { ok: true, valor: num };
}

async function crear(req, res) {
  const { nombre, limite, diaCorte, diaPago, porcentajePagoMinimo, grupoId } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const limiteNum = Number(limite);
  if (!Number.isFinite(limiteNum) || limiteNum <= 0) {
    return res.status(400).json({ error: "limite debe ser un número mayor a 0" });
  }
  const diaCorteNum = validarDia(diaCorte);
  if (!diaCorteNum) return res.status(400).json({ error: "diaCorte debe ser un entero entre 1 y 31" });
  const diaPagoNum = validarDia(diaPago);
  if (!diaPagoNum) return res.status(400).json({ error: "diaPago debe ser un entero entre 1 y 31" });

  let porcentajeNum = 5;
  if (porcentajePagoMinimo !== undefined) {
    porcentajeNum = Number(porcentajePagoMinimo);
    if (!Number.isFinite(porcentajeNum) || porcentajeNum <= 0 || porcentajeNum > 100) {
      return res.status(400).json({ error: "porcentajePagoMinimo debe estar entre 0 y 100" });
    }
  }

  const grupoValidado = await validarGrupoId(grupoId, req.usuarioId);
  if (!grupoValidado.ok) return res.status(400).json({ error: "grupoId inválido" });

  const tarjeta = await prisma.tarjetaCredito.create({
    data: {
      usuarioId: req.usuarioId,
      grupoId: grupoValidado.valor,
      nombre: nombre.trim(),
      limite: limiteNum,
      diaCorte: diaCorteNum,
      diaPago: diaPagoNum,
      porcentajePagoMinimo: porcentajeNum,
    },
  });
  res.status(201).json({ tarjeta: { ...tarjeta, info: calcularInfoTarjeta(tarjeta) } });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.tarjetaCredito.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Tarjeta no encontrada" });
  }

  const { nombre, limite, diaCorte, diaPago, porcentajePagoMinimo, grupoId } = req.body;
  const data = {};

  if (grupoId !== undefined) {
    const grupoValidado = await validarGrupoId(grupoId, req.usuarioId);
    if (!grupoValidado.ok) return res.status(400).json({ error: "grupoId inválido" });
    data.grupoId = grupoValidado.valor;
  }
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (limite !== undefined) {
    const limiteNum = Number(limite);
    if (!Number.isFinite(limiteNum) || limiteNum <= 0) {
      return res.status(400).json({ error: "limite debe ser un número mayor a 0" });
    }
    data.limite = limiteNum;
  }
  if (diaCorte !== undefined) {
    const diaCorteNum = validarDia(diaCorte);
    if (!diaCorteNum) return res.status(400).json({ error: "diaCorte debe ser un entero entre 1 y 31" });
    data.diaCorte = diaCorteNum;
  }
  if (diaPago !== undefined) {
    const diaPagoNum = validarDia(diaPago);
    if (!diaPagoNum) return res.status(400).json({ error: "diaPago debe ser un entero entre 1 y 31" });
    data.diaPago = diaPagoNum;
  }
  if (porcentajePagoMinimo !== undefined) {
    const porcentajeNum = Number(porcentajePagoMinimo);
    if (!Number.isFinite(porcentajeNum) || porcentajeNum <= 0 || porcentajeNum > 100) {
      return res.status(400).json({ error: "porcentajePagoMinimo debe estar entre 0 y 100" });
    }
    data.porcentajePagoMinimo = porcentajeNum;
  }

  const tarjeta = await prisma.tarjetaCredito.update({ where: { id }, data });
  res.json({ tarjeta: { ...tarjeta, info: calcularInfoTarjeta(tarjeta) } });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.tarjetaCredito.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Tarjeta no encontrada" });
  }

  await prisma.tarjetaCredito.delete({ where: { id } });
  res.status(204).send();
}

// Paga el saldo completo de una sola vez: crea el movimiento de pago (monto
// negativo) y deja saldoActual en 0. Es el atajo de "ya pagué esto" en vez
// de tener que calcular el monto a mano en el formulario de movimientos.
async function pagar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.tarjetaCredito.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Tarjeta no encontrada" });
  }

  const saldo = Number(existente.saldoActual);
  if (saldo <= 0) {
    return res.status(400).json({ error: "Esta tarjeta no tiene saldo pendiente" });
  }

  const hoy = new Date();
  const fechaHoy = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  const [, tarjeta] = await prisma.$transaction([
    prisma.movimientoTarjeta.create({
      data: { tarjetaId: id, monto: -saldo, fecha: fechaHoy, descripcion: "Pago total" },
    }),
    prisma.tarjetaCredito.update({ where: { id }, data: { saldoActual: 0 } }),
  ]);

  res.json({ tarjeta: { ...tarjeta, info: calcularInfoTarjeta(tarjeta) } });
}

module.exports = { listar, crear, actualizar, eliminar, pagar };
