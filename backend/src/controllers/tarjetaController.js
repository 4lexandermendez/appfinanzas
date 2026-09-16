const prisma = require("../lib/prisma");
const { calcularInfoTarjeta, calcularMontoCicloVencido } = require("../services/tarjetaService");
const { validarCuentaPropia } = require("../services/cuentaEfectivoService");
const { resolverCuentaDestinoReserva, ejecutarReserva } = require("../services/reservaTarjetaService");
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

  // Cuenta origen opcional: la que el usuario ya usa para "apartar" el pago
  // de esta tarjeta (ej. una cuenta de ahorro del mismo banco). Si se manda,
  // ademas de pagar la tarjeta se descuenta el mismo monto de esa cuenta —
  // sin esto, el usuario tiene que llevar ese descuento a mano.
  const { cuentaOrigenId } = req.body;
  let cuentaOrigen = null;
  if (cuentaOrigenId) {
    cuentaOrigen = await validarCuentaPropia(req.usuarioId, Number(cuentaOrigenId));
    if (!cuentaOrigen) return res.status(404).json({ error: "Cuenta no encontrada" });
    if (montoAPagar > Number(cuentaOrigen.saldoActual)) {
      return res.status(400).json({ error: "El monto supera el saldo disponible en la cuenta origen" });
    }
  }

  const fechaHoy = hoyElSalvador();

  const tarjeta = await prisma.$transaction(async (tx) => {
    await tx.movimientoTarjeta.create({
      data: { tarjetaId: id, monto: -montoAPagar, fecha: fechaHoy, descripcion: "Pago total" },
    });
    const actualizada = await tx.tarjetaCredito.update({
      where: { id },
      data: { saldoActual: { decrement: montoAPagar } },
    });

    if (cuentaOrigen) {
      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuentaOrigen.id,
          monto: -montoAPagar,
          fecha: fechaHoy,
          descripcion: `Pago tarjeta ${existente.nombre}`,
        },
      });
      await tx.cuentaBancaria.update({
        where: { id: cuentaOrigen.id },
        data: { saldoActual: { decrement: montoAPagar } },
      });
    }

    return actualizada;
  }, { timeout: 15000 });

  res.json({ tarjeta: { ...tarjeta, info: calcularInfoTarjeta(tarjeta) } });
}

// A diferencia de "pagar" (que solo paga el monto exacto del ciclo ya
// cortado), esto deja abonar cualquier monto en cualquier momento — util
// para ir bajando saldo antes de que el ciclo corte, en vez de esperar y
// pagar todo de una vez.
async function abonar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.tarjetaCredito.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Tarjeta no encontrada" });
  }

  const monto = Number(req.body.monto);
  if (!monto || monto <= 0) {
    return res.status(400).json({ error: "El monto del abono debe ser mayor a 0" });
  }
  if (monto > Number(existente.saldoActual)) {
    return res.status(400).json({ error: "El abono no puede ser mayor al saldo de la tarjeta" });
  }

  const { cuentaOrigenId } = req.body;
  let cuentaOrigen = null;
  if (cuentaOrigenId) {
    cuentaOrigen = await validarCuentaPropia(req.usuarioId, Number(cuentaOrigenId));
    if (!cuentaOrigen) return res.status(404).json({ error: "Cuenta no encontrada" });
    if (monto > Number(cuentaOrigen.saldoActual)) {
      return res.status(400).json({ error: "El monto supera el saldo disponible en la cuenta origen" });
    }
  }

  const fechaHoy = hoyElSalvador();

  const tarjeta = await prisma.$transaction(async (tx) => {
    await tx.movimientoTarjeta.create({
      data: { tarjetaId: id, monto: -monto, fecha: fechaHoy, descripcion: "Abono" },
    });
    const actualizada = await tx.tarjetaCredito.update({
      where: { id },
      data: { saldoActual: { decrement: monto } },
    });

    if (cuentaOrigen) {
      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuentaOrigen.id,
          monto: -monto,
          fecha: fechaHoy,
          descripcion: `Abono tarjeta ${existente.nombre}`,
        },
      });
      await tx.cuentaBancaria.update({
        where: { id: cuentaOrigen.id },
        data: { saldoActual: { decrement: monto } },
      });
    }

    return actualizada;
  }, { timeout: 15000 });

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

// Gastos con tarjeta que todavia no tienen la plata apartada — es decir,
// cargados desde el ultimo pago, vinculados a una transaccion o gasto fijo
// (los movimientos manuales sin vinculo quedan fuera, no hay gasto rastreado
// que asociarles), y cuyo gasto vinculado no tiene un movimientoCuenta de
// reserva. Es lo que le faltaria pasar el usuario a la cuenta del banco
// correspondiente para no quedar debiendose plata a si mismo sin saberlo.
async function pendienteApartar(req, res) {
  const tarjetas = await prisma.tarjetaCredito.findMany({ where: { usuarioId: req.usuarioId } });
  if (tarjetas.length === 0) return res.json({ pendientes: [] });

  const movimientos = await prisma.movimientoTarjeta.findMany({
    where: { tarjetaId: { in: tarjetas.map((t) => t.id) } },
    orderBy: { id: "asc" },
    include: {
      transaccion: { include: { movimientoCuenta: true, categoria: true } },
      gastoFijoMensual: { include: { movimientoCuenta: true, gastoFijoConfig: true } },
    },
  });

  const nombrePorTarjeta = new Map(tarjetas.map((t) => [t.id, t.nombre]));
  const movimientosPorTarjeta = new Map();
  for (const m of movimientos) {
    if (!movimientosPorTarjeta.has(m.tarjetaId)) movimientosPorTarjeta.set(m.tarjetaId, []);
    movimientosPorTarjeta.get(m.tarjetaId).push(m);
  }

  const pendientes = [];
  for (const [tarjetaId, movs] of movimientosPorTarjeta) {
    const idUltimoPago = movs.filter((m) => Number(m.monto) < 0).reduce((max, m) => Math.max(max, m.id), 0);
    for (const m of movs) {
      if (m.id <= idUltimoPago || Number(m.monto) <= 0) continue;

      let gasto = null;
      let tipo = null;
      if (m.transaccion) {
        gasto = m.transaccion;
        tipo = "transaccion";
      } else if (m.gastoFijoMensual) {
        gasto = m.gastoFijoMensual;
        tipo = "gastoFijo";
      } else {
        continue;
      }
      if (gasto.movimientoCuenta) continue;

      pendientes.push({
        tarjetaId,
        tarjetaNombre: nombrePorTarjeta.get(tarjetaId),
        monto: Number(m.monto),
        fecha: m.fecha,
        descripcion: tipo === "transaccion" ? gasto.categoria.nombre : gasto.gastoFijoConfig.nombre,
        transaccionId: tipo === "transaccion" ? gasto.id : null,
        gastoFijoMensualId: tipo === "gastoFijo" ? gasto.id : null,
      });
    }
  }

  res.json({ pendientes });
}

// Aparta ahora la plata de un gasto con tarjeta que quedo pendiente (ver
// pendienteApartar) — mismo mecanismo que se usa al crear el gasto, solo
// que aplicado despues sobre uno que ya existe.
async function apartarAhora(req, res) {
  const { transaccionId, gastoFijoMensualId, cuentaOrigenId, cuentaDestinoId } = req.body;
  if (!transaccionId && !gastoFijoMensualId) {
    return res.status(400).json({ error: "transaccionId o gastoFijoMensualId es requerido" });
  }
  if (!cuentaOrigenId) {
    return res.status(400).json({ error: "cuentaOrigenId es requerido" });
  }

  let gasto, tarjetaId, monto, descripcion, vinculo;
  if (transaccionId) {
    gasto = await prisma.transaccion.findUnique({
      where: { id: Number(transaccionId) },
      include: { presupuesto: true, categoria: true, movimientoCuenta: true },
    });
    if (!gasto || gasto.presupuesto.usuarioId !== req.usuarioId) return res.status(404).json({ error: "Gasto no encontrado" });
    if (gasto.fuente !== "TARJETA" || !gasto.tarjetaId) return res.status(400).json({ error: "Este gasto no es de tarjeta" });
    tarjetaId = gasto.tarjetaId;
    monto = Number(gasto.monto);
    descripcion = gasto.categoria.nombre;
    vinculo = { transaccionId: gasto.id };
  } else {
    gasto = await prisma.gastoFijoMensual.findUnique({
      where: { id: Number(gastoFijoMensualId) },
      include: { presupuesto: true, gastoFijoConfig: true, movimientoCuenta: true },
    });
    if (!gasto || gasto.presupuesto.usuarioId !== req.usuarioId) return res.status(404).json({ error: "Gasto no encontrado" });
    if (gasto.fuente !== "TARJETA" || !gasto.tarjetaId) return res.status(400).json({ error: "Este gasto no es de tarjeta" });
    tarjetaId = gasto.tarjetaId;
    monto = Number(gasto.montoReal);
    descripcion = gasto.gastoFijoConfig.nombre;
    vinculo = { gastoFijoMensualId: gasto.id };
  }
  if (gasto.movimientoCuenta) {
    return res.status(400).json({ error: "Este gasto ya tiene la plata apartada" });
  }

  const cuentaOrigen = await validarCuentaPropia(req.usuarioId, Number(cuentaOrigenId));
  if (!cuentaOrigen) return res.status(404).json({ error: "Cuenta origen no encontrada" });
  if (monto > Number(cuentaOrigen.saldoActual)) {
    return res.status(400).json({ error: "El monto supera el saldo disponible en la cuenta origen" });
  }
  const destino = await resolverCuentaDestinoReserva(tarjetaId, cuentaDestinoId ? Number(cuentaDestinoId) : null);
  if (!destino.ok) return res.status(400).json({ error: destino.error, opciones: destino.opciones });
  if (destino.cuenta.id === cuentaOrigen.id) {
    return res.status(400).json({ error: "La cuenta origen y destino no pueden ser la misma" });
  }

  await prisma.$transaction(
    (tx) =>
      ejecutarReserva(tx, {
        cuentaOrigen,
        cuentaDestino: destino.cuenta,
        monto,
        descripcion,
        fecha: hoyElSalvador(),
        vinculo,
      }),
    { timeout: 15000 }
  );

  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar, pagar, abonar, resumenPago, pendienteApartar, apartarAhora };
