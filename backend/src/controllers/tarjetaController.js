const prisma = require("../lib/prisma");
const { calcularInfoTarjeta, calcularMontoCicloVencido } = require("../services/tarjetaService");
const { hoyElSalvador } = require("../utils/fecha");

async function listar(req, res) {
  const tarjetas = await prisma.tarjetaCredito.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: { nombre: "asc" },
  });
  if (tarjetas.length === 0) return res.json({ tarjetas: [] });

  const movimientos = await prisma.movimientoTarjeta.findMany({
    where: { tarjetaId: { in: tarjetas.map((t) => t.id) } },
    orderBy: { id: "asc" },
  });
  const movimientosPorTarjeta = new Map();
  for (const m of movimientos) {
    if (!movimientosPorTarjeta.has(m.tarjetaId)) movimientosPorTarjeta.set(m.tarjetaId, []);
    movimientosPorTarjeta.get(m.tarjetaId).push(m);
  }

  res.json({
    tarjetas: tarjetas.map((t) => {
      const info = calcularInfoTarjeta(t);
      // Lo que de verdad hay que pagar ahora (ciclo ya cortado) — distinto
      // de info.pagoTotal, que es el saldo completo e incluye compras del
      // ciclo nuevo que todavia no vencen.
      info.montoCicloVencido = calcularMontoCicloVencido(movimientosPorTarjeta.get(t.id) || [], info.ciclo);
      return { ...t, info };
    }),
  });
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

// Paga SOLO lo que corresponde al ciclo ya cortado (no el saldo completo):
// si ya hay compras nuevas del ciclo que recien empezo, esas quedan sin
// tocar — pagarlas de mas seria adelantar algo que ni siquiera vence
// todavia. Crea el movimiento de pago (monto negativo) por ese monto y
// resta lo mismo del saldo, en vez de dejarlo en 0 a la fuerza.
async function pagar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.tarjetaCredito.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Tarjeta no encontrada" });
  }

  const info = calcularInfoTarjeta(existente);
  const movimientos = await prisma.movimientoTarjeta.findMany({ where: { tarjetaId: id }, orderBy: { id: "asc" } });
  const montoAPagar = calcularMontoCicloVencido(movimientos, info.ciclo);
  if (montoAPagar <= 0) {
    return res.status(400).json({ error: "No hay saldo pendiente del ciclo ya cortado (lo que tenés es del ciclo nuevo, todavía no vence)" });
  }

  const fechaHoy = hoyElSalvador();

  const [, tarjeta] = await prisma.$transaction([
    prisma.movimientoTarjeta.create({
      data: { tarjetaId: id, monto: -montoAPagar, fecha: fechaHoy, descripcion: "Pago total" },
    }),
    prisma.tarjetaCredito.update({ where: { id }, data: { saldoActual: { decrement: montoAPagar } } }),
  ]);

  res.json({ tarjeta: { ...tarjeta, info: calcularInfoTarjeta(tarjeta) } });
}

// Cuanto hay que pagar del ciclo YA CORTADO de cada tarjeta, y en cuantos
// dias — para el aviso de Registro Rapido. Solo cuenta lo cargado hasta
// corteVencido (no lo que ya se esta acumulando en el ciclo nuevo, todavia
// abierto) y que no se haya pagado ya (id posterior al ultimo pago) — asi
// una tarjeta recien pagada, con compras nuevas en el ciclo que recien
// empieza, no aparece hasta que ese ciclo tambien corte.
async function resumenPago(req, res) {
  const tarjetas = await prisma.tarjetaCredito.findMany({ where: { usuarioId: req.usuarioId } });
  if (tarjetas.length === 0) return res.json({ pendientes: [] });

  const movimientos = await prisma.movimientoTarjeta.findMany({
    where: { tarjetaId: { in: tarjetas.map((t) => t.id) } },
    orderBy: { id: "asc" },
  });
  const movimientosPorTarjeta = new Map();
  for (const m of movimientos) {
    if (!movimientosPorTarjeta.has(m.tarjetaId)) movimientosPorTarjeta.set(m.tarjetaId, []);
    movimientosPorTarjeta.get(m.tarjetaId).push(m);
  }

  const pendientes = [];
  for (const t of tarjetas) {
    const info = calcularInfoTarjeta(t);
    const movs = movimientosPorTarjeta.get(t.id) || [];
    const montoCiclo = calcularMontoCicloVencido(movs, info.ciclo);
    if (montoCiclo > 0) {
      pendientes.push({
        tarjetaId: t.id,
        nombre: t.nombre,
        monto: montoCiclo,
        diasParaPago: info.diasParaPago,
        fechaPago: info.ciclo.pagoVencido,
      });
    }
  }

  res.json({ pendientes });
}

module.exports = { listar, crear, actualizar, eliminar, pagar, resumenPago };
