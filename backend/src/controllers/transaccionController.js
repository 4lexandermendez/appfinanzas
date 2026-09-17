const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");
const { obtenerCuentaEfectivo, validarCuentaPropia } = require("../services/cuentaEfectivoService");
const { resolverCuentaDestinoReserva, ejecutarReserva } = require("../services/reservaTarjetaService");

const FUENTES_VALIDAS = ["EFECTIVO", "TARJETA", "CUENTA_BANCO", "EXTERNO"];
const CUENTAS_VALIDAS = ["CUSCATLAN", "MULTIMONEY", "BAC", "AGRICOLA_PRINCIPAL", "AGRICOLA_SECUNDARIA"];

function parseFecha(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
}

async function validarCategoria(usuarioId, categoriaId) {
  const categoria = await prisma.categoriaVariable.findUnique({ where: { id: categoriaId } });
  return categoria && categoria.usuarioId === usuarioId ? categoria : null;
}

async function validarTarjeta(usuarioId, tarjetaId) {
  if (!tarjetaId) return true;
  const tarjeta = await prisma.tarjetaCredito.findUnique({ where: { id: tarjetaId } });
  return Boolean(tarjeta && tarjeta.usuarioId === usuarioId);
}

// Cada aporte externo es plata que puso otra persona (no el usuario) para
// cubrir parte de este gasto — se resta del "Real" que cuenta contra el
// presupuesto (ver resumenMensualService), pero el monto total del gasto
// (y del movimiento de tarjeta, si aplica) sigue siendo el cobrado de
// verdad. Devuelve null si algo no es valido.
function parsearAportesExternos(aportesExternos, montoTotal) {
  if (aportesExternos === undefined) return [];
  if (!Array.isArray(aportesExternos)) return null;
  const montos = aportesExternos.map((a) => Number(a));
  if (montos.some((m) => !Number.isFinite(m) || m <= 0)) return null;
  const suma = montos.reduce((s, m) => s + m, 0);
  if (suma > montoTotal) return null;
  return montos;
}

async function listar(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);

  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });

  if (!presupuesto) {
    return res.json({ transacciones: [] });
  }

  const transacciones = await prisma.transaccion.findMany({
    where: { presupuestoId: presupuesto.id },
    include: { categoria: true, aportesExternos: true },
    orderBy: { fecha: "desc" },
  });

  res.json({ transacciones });
}

async function crear(req, res) {
  const { categoriaId, monto, fecha, notas, fuente, tarjetaId, cuenta, cuentaBancariaId, aportesExternos, cuentaOrigenId, cuentaDestinoId } = req.body;

  if (!categoriaId || monto === undefined || !fecha) {
    return res.status(400).json({ error: "categoriaId, monto y fecha son requeridos" });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "monto debe ser un número mayor a 0" });
  }
  const aportesNum = parsearAportesExternos(aportesExternos, montoNum);
  if (aportesNum === null) {
    return res.status(400).json({ error: "aportesExternos debe ser una lista de montos válidos que no superen el monto total" });
  }
  const fechaParsed = parseFecha(fecha);
  if (!fechaParsed) {
    return res.status(400).json({ error: "fecha inválida" });
  }
  const fuenteFinal = fuente ?? "EFECTIVO";
  if (!FUENTES_VALIDAS.includes(fuenteFinal)) {
    return res.status(400).json({ error: `fuente debe ser una de: ${FUENTES_VALIDAS.join(", ")}` });
  }
  if (fuenteFinal === "TARJETA" && !tarjetaId) {
    return res.status(400).json({ error: "tarjetaId es requerido cuando fuente es TARJETA" });
  }
  // CUENTA_BANCO acepta o bien una cuenta real (cuentaBancariaId, que si
  // descuenta saldo) o la etiqueta vieja (enum cuenta, solo informativa).
  if (fuenteFinal === "CUENTA_BANCO" && !cuentaBancariaId && !CUENTAS_VALIDAS.includes(cuenta)) {
    return res.status(400).json({ error: "Indicá de cuál cuenta pagaste (cuentaBancariaId)" });
  }

  const categoria = await validarCategoria(req.usuarioId, Number(categoriaId));
  if (!categoria) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }
  if (!(await validarTarjeta(req.usuarioId, tarjetaId ? Number(tarjetaId) : null))) {
    return res.status(404).json({ error: "Tarjeta no encontrada" });
  }

  const anio = fechaParsed.getUTCFullYear();
  const mes = fechaParsed.getUTCMonth() + 1;
  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, anio, mes);
  // Cuenta de la que sale la plata en el momento: la billetera si es
  // EFECTIVO, o la cuenta bancaria elegida si es CUENTA_BANCO con id real.
  let cuentaDebito = null;
  if (fuenteFinal === "EFECTIVO") {
    cuentaDebito = await obtenerCuentaEfectivo(req.usuarioId);
  } else if (fuenteFinal === "CUENTA_BANCO" && cuentaBancariaId) {
    cuentaDebito = await validarCuentaPropia(req.usuarioId, Number(cuentaBancariaId));
    if (!cuentaDebito) return res.status(404).json({ error: "Cuenta no encontrada" });
    if (montoNum > Number(cuentaDebito.saldoActual)) {
      return res.status(400).json({ error: "El monto supera el saldo disponible en esa cuenta" });
    }
  }

  // Apartar plata al momento de cargar a la tarjeta (opcional): si se manda
  // cuentaOrigenId, se transfiere el monto completo de ahi a la cuenta del
  // banco de la tarjeta (auto-detectada si ese banco tiene una sola cuenta,
  // o la indicada en cuentaDestinoId si tiene varias) — es el mismo paso
  // manual de "Transferir" que ya se hacia despues, ahora automatico.
  let reserva = null;
  if (fuenteFinal === "TARJETA" && cuentaOrigenId) {
    const cuentaOrigen = await validarCuentaPropia(req.usuarioId, Number(cuentaOrigenId));
    if (!cuentaOrigen) return res.status(404).json({ error: "Cuenta origen no encontrada" });
    if (montoNum > Number(cuentaOrigen.saldoActual)) {
      return res.status(400).json({ error: "El monto supera el saldo disponible en la cuenta origen" });
    }
    const destino = await resolverCuentaDestinoReserva(Number(tarjetaId), cuentaDestinoId ? Number(cuentaDestinoId) : null);
    if (!destino.ok) return res.status(400).json({ error: destino.error, opciones: destino.opciones });
    if (destino.cuenta.id === cuentaOrigen.id) {
      return res.status(400).json({ error: "La cuenta origen y destino no pueden ser la misma" });
    }
    reserva = { cuentaOrigen, cuentaDestino: destino.cuenta };
  }

  // Si se paga con tarjeta, ademas de la transaccion se crea el movimiento
  // en la tarjeta (vinculado via transaccionId) y se suma el monto al saldo
  // — asi el gasto variable pagado con tarjeta ya queda reflejado ahi, sin
  // tener que registrarlo dos veces. Si se paga en efectivo y el usuario ya
  // tiene una billetera configurada, se hace lo mismo pero restando del
  // saldo de esa cuenta — el "Real" de la categoría no cambia en ningún
  // caso, es un efecto en paralelo.
  const transaccion = await prisma.$transaction(async (tx) => {
    const creada = await tx.transaccion.create({
      data: {
        presupuestoId: presupuesto.id,
        categoriaId: categoria.id,
        monto: montoNum,
        fecha: fechaParsed,
        notas: notas || null,
        fuente: fuenteFinal,
        tarjetaId: tarjetaId ? Number(tarjetaId) : null,
        cuenta: fuenteFinal === "CUENTA_BANCO" ? cuenta : null,
      },
      include: { categoria: true },
    });

    if (aportesNum.length > 0) {
      await tx.aporteExterno.createMany({
        data: aportesNum.map((monto) => ({ transaccionId: creada.id, monto })),
      });
    }

    if (fuenteFinal === "TARJETA" && creada.tarjetaId) {
      await tx.movimientoTarjeta.create({
        data: {
          tarjetaId: creada.tarjetaId,
          monto: montoNum,
          fecha: fechaParsed,
          descripcion: creada.categoria.nombre,
          transaccionId: creada.id,
        },
      });
      await tx.tarjetaCredito.update({
        where: { id: creada.tarjetaId },
        data: { saldoActual: { increment: montoNum } },
      });
      if (reserva) {
        await ejecutarReserva(tx, {
          cuentaOrigen: reserva.cuentaOrigen,
          cuentaDestino: reserva.cuentaDestino,
          monto: montoNum,
          descripcion: creada.categoria.nombre,
          fecha: fechaParsed,
          vinculo: { transaccionId: creada.id },
        });
      }
    } else if (cuentaDebito) {
      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuentaDebito.id,
          monto: -montoNum,
          fecha: fechaParsed,
          descripcion: creada.categoria.nombre,
          transaccionId: creada.id,
        },
      });
      await tx.cuentaBancaria.update({
        where: { id: cuentaDebito.id },
        data: { saldoActual: { decrement: montoNum } },
      });
    }

    return tx.transaccion.findUnique({ where: { id: creada.id }, include: { categoria: true, aportesExternos: true } });
  }, { timeout: 15000 });

  res.status(201).json({ transaccion });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.transaccion.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoTarjeta: true, movimientoCuenta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Transacción no encontrada" });
  }

  const { categoriaId, monto, fecha, notas, fuente, tarjetaId, cuenta, aportesExternos } = req.body;
  const data = {};

  if (categoriaId !== undefined) {
    const categoria = await validarCategoria(req.usuarioId, Number(categoriaId));
    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    data.categoriaId = categoria.id;
  }

  if (monto !== undefined) {
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: "monto debe ser un número mayor a 0" });
    }
    data.monto = montoNum;
  }

  const montoParaAportes = data.monto ?? Number(existente.monto);
  const aportesNum = parsearAportesExternos(aportesExternos, montoParaAportes);
  if (aportesNum === null) {
    return res.status(400).json({ error: "aportesExternos debe ser una lista de montos válidos que no superen el monto total" });
  }

  let presupuestoId;
  if (fecha !== undefined) {
    const fechaParsed = parseFecha(fecha);
    if (!fechaParsed) {
      return res.status(400).json({ error: "fecha inválida" });
    }
    data.fecha = fechaParsed;
    const presupuesto = await obtenerOCrearPresupuesto(
      req.usuarioId,
      fechaParsed.getUTCFullYear(),
      fechaParsed.getUTCMonth() + 1
    );
    presupuestoId = presupuesto.id;
    data.presupuestoId = presupuestoId;
  }

  if (notas !== undefined) data.notas = notas || null;

  if (fuente !== undefined) {
    if (!FUENTES_VALIDAS.includes(fuente)) {
      return res.status(400).json({ error: `fuente debe ser una de: ${FUENTES_VALIDAS.join(", ")}` });
    }
    data.fuente = fuente;
  }

  if (tarjetaId !== undefined) {
    if (tarjetaId !== null && !(await validarTarjeta(req.usuarioId, Number(tarjetaId)))) {
      return res.status(404).json({ error: "Tarjeta no encontrada" });
    }
    data.tarjetaId = tarjetaId ? Number(tarjetaId) : null;
  }

  if (cuenta !== undefined) {
    if (cuenta !== null && !CUENTAS_VALIDAS.includes(cuenta)) {
      return res.status(400).json({ error: `cuenta debe ser una de: ${CUENTAS_VALIDAS.join(", ")}` });
    }
    data.cuenta = cuenta || null;
  }

  // Si esta transaccion ya tenia un movimiento en una tarjeta vinculado y
  // cambia el monto o la fecha, se actualiza tambien el movimiento y se
  // ajusta el saldo de la tarjeta por la diferencia, para que no queden
  // desincronizados.
  const transaccion = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.transaccion.update({ where: { id }, data, include: { categoria: true } });

    if (aportesExternos !== undefined) {
      await tx.aporteExterno.deleteMany({ where: { transaccionId: id } });
      if (aportesNum.length > 0) {
        await tx.aporteExterno.createMany({
          data: aportesNum.map((monto) => ({ transaccionId: id, monto })),
        });
      }
    }

    if (existente.movimientoTarjeta) {
      const movimientoData = {};
      if (data.monto !== undefined) movimientoData.monto = data.monto;
      if (data.fecha !== undefined) movimientoData.fecha = data.fecha;
      if (Object.keys(movimientoData).length > 0) {
        await tx.movimientoTarjeta.update({ where: { id: existente.movimientoTarjeta.id }, data: movimientoData });
      }
      if (data.monto !== undefined) {
        const delta = data.monto - Number(existente.movimientoTarjeta.monto);
        await tx.tarjetaCredito.update({
          where: { id: existente.movimientoTarjeta.tarjetaId },
          data: { saldoActual: { increment: delta } },
        });
      }
    }

    // Mismo ajuste por delta que arriba, pero para el movimiento vinculado
    // en la billetera de efectivo (si el gasto se paga con EFECTIVO y ya
    // tenía un movimiento vinculado). El monto ahí se guarda negativo
    // (salida de la billetera), por eso el delta ya sale con el signo
    // correcto sin necesidad de invertir nada más.
    if (existente.movimientoCuenta) {
      const movimientoData = {};
      if (data.monto !== undefined) movimientoData.monto = -data.monto;
      if (data.fecha !== undefined) movimientoData.fecha = data.fecha;
      if (Object.keys(movimientoData).length > 0) {
        await tx.movimientoCuenta.update({ where: { id: existente.movimientoCuenta.id }, data: movimientoData });
      }
      if (data.monto !== undefined) {
        const delta = movimientoData.monto - Number(existente.movimientoCuenta.monto);
        await tx.cuentaBancaria.update({
          where: { id: existente.movimientoCuenta.cuentaId },
          data: { saldoActual: { increment: delta } },
        });
      }
    }

    return tx.transaccion.findUnique({ where: { id: actualizada.id }, include: { categoria: true, aportesExternos: true } });
  }, { timeout: 15000 });

  res.json({ transaccion });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.transaccion.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoTarjeta: true, movimientoCuenta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Transacción no encontrada" });
  }

  // Si tiene un movimiento de tarjeta o de cuenta (efectivo) vinculado hay
  // que borrarlo primero (la FK no tiene cascade) y devolver el monto al
  // saldo correspondiente.
  await prisma.$transaction(async (tx) => {
    if (existente.movimientoTarjeta) {
      await tx.movimientoTarjeta.delete({ where: { id: existente.movimientoTarjeta.id } });
      await tx.tarjetaCredito.update({
        where: { id: existente.movimientoTarjeta.tarjetaId },
        data: { saldoActual: { decrement: Number(existente.movimientoTarjeta.monto) } },
      });
    }
    if (existente.movimientoCuenta) {
      await tx.movimientoCuenta.delete({ where: { id: existente.movimientoCuenta.id } });
      await tx.cuentaBancaria.update({
        where: { id: existente.movimientoCuenta.cuentaId },
        data: { saldoActual: { decrement: Number(existente.movimientoCuenta.monto) } },
      });
    }
    await tx.transaccion.delete({ where: { id } });
  }, { timeout: 15000 });

  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
