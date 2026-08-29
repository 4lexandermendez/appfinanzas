const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");
const { obtenerCuentaEfectivo, validarCuentaPropia } = require("../services/cuentaEfectivoService");
const { resolverCuentaDestinoReserva, ejecutarReserva } = require("../services/reservaTarjetaService");
const { redondear } = require("../utils/dinero");
const { hoyElSalvador } = require("../utils/fecha");

async function listarConfig(req, res) {
  const config = await prisma.gastoFijoConfig.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  res.json({ gastosFijos: config });
}

async function crearConfig(req, res) {
  const { nombre, montoEstimado } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "nombre es requerido" });
  }
  const montoNum = Number(montoEstimado);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
  }

  const gastoFijo = await prisma.gastoFijoConfig.create({
    data: { usuarioId: req.usuarioId, nombre: nombre.trim(), montoEstimado: montoNum, activo: true },
  });

  // Un gasto fijo recién creado se da por seleccionado para el mes en curso
  // (el usuario lo está agregando ahora mismo). Los meses futuros se
  // ofrecen como sugerencia, uno por uno, cuando llegan.
  const hoy = hoyElSalvador();
  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, hoy.getUTCFullYear(), hoy.getUTCMonth() + 1);
  await prisma.gastoFijoMensual.create({
    data: { presupuestoId: presupuesto.id, gastoFijoConfigId: gastoFijo.id, montoEstimado: montoNum },
  });

  res.status(201).json({ gastoFijo });
}

async function actualizarConfig(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.gastoFijoConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  const { nombre, montoEstimado, activo } = req.body;
  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (montoEstimado !== undefined) {
    const montoNum = Number(montoEstimado);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
    }
    data.montoEstimado = montoNum;
  }
  if (activo !== undefined) {
    if (typeof activo !== "boolean") return res.status(400).json({ error: "activo debe ser true o false" });
    data.activo = activo;
    data.desactivadoEn = activo ? null : new Date();
  }

  const gastoFijo = await prisma.gastoFijoConfig.update({ where: { id }, data });
  res.json({ gastoFijo });
}

async function eliminarConfig(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.gastoFijoConfig.findUnique({ where: { id } });
  if (!existente || existente.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  await prisma.gastoFijoConfig.delete({ where: { id } });
  res.status(204).send();
}

// La lista de un mes ya no se arma "adivinando" vigencia por fecha: solo
// cuentan los gastos fijos que el usuario seleccionó explícitamente para
// ese mes (existe una fila en gastos_fijos_mensual). Los que están activos
// pero todavía no se seleccionaron para este mes se devuelven aparte como
// "sugerencias" (con el último monto conocido, editable al agregarlos).
async function listarMensual(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const configTodos = await prisma.gastoFijoConfig.findMany({
    where: { usuarioId: req.usuarioId },
    orderBy: { nombre: "asc" },
  });

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  const registrosMensuales = presupuesto
    ? await prisma.gastoFijoMensual.findMany({
        where: { presupuestoId: presupuesto.id },
        include: { aportesExternos: true },
      })
    : [];
  const registroPorConfig = new Map(registrosMensuales.map((r) => [r.gastoFijoConfigId, r]));

  const gastosFijos = [];
  const sugerencias = [];
  for (const c of configTodos) {
    const registro = registroPorConfig.get(c.id);
    if (registro) {
      const aportes = registro.aportesExternos.reduce((s, a) => s + Number(a.monto), 0);
      gastosFijos.push({
        gastoFijoConfigId: c.id,
        nombre: c.nombre,
        montoEstimado: registro.montoEstimado ?? c.montoEstimado,
        montoReal: registro.montoReal !== null ? redondear(Number(registro.montoReal) - aportes) : null,
      });
    } else if (c.activo) {
      sugerencias.push({ gastoFijoConfigId: c.id, nombre: c.nombre, montoSugerido: c.montoEstimado });
    }
  }

  res.json({ gastosFijos, sugerencias });
}

const FUENTES_VALIDAS = ["EFECTIVO", "TARJETA", "CUENTA_BANCO", "EXTERNO"];
const CUENTAS_VALIDAS = ["CUSCATLAN", "MULTIMONEY", "BAC", "AGRICOLA_PRINCIPAL", "AGRICOLA_SECUNDARIA"];

// Cada aporte externo es plata que puso otra persona (no el usuario) para
// cubrir parte de este gasto — se resta del "Real" que cuenta contra el
// presupuesto, pero el monto real total (y el movimiento de tarjeta, si
// aplica) sigue siendo el pagado de verdad. Devuelve null si algo no es
// valido.
function parsearAportesExternos(aportesExternos, montoTotal) {
  if (aportesExternos === undefined) return [];
  if (!Array.isArray(aportesExternos)) return null;
  const montos = aportesExternos.map((a) => Number(a));
  if (montos.some((m) => !Number.isFinite(m) || m <= 0)) return null;
  const suma = montos.reduce((s, m) => s + m, 0);
  if (suma > montoTotal) return null;
  return montos;
}

// Se usa tanto para "seleccionar" un gasto fijo sugerido en el mes (mandando
// montoEstimado) como para marcar el Real ya pagado. El montoEstimado, si
// viene, también actualiza la config para que sea el monto sugerido la
// próxima vez (ej. subiste de Netflix $15 a $18, el próximo mes sugiere $18).
//
// Si se paga con tarjeta (fuente=TARJETA + tarjetaId), se crea/ajusta un
// MovimientoTarjeta vinculado y se suma el monto real al saldo de esa
// tarjeta — igual que con Gasto Variable. Si el monto real cambia despues
// (desde Registro Rápido o desde Presupuesto) y ya había un movimiento
// vinculado, se ajusta el saldo por la diferencia en vez de duplicarlo; si
// se pasa de tarjeta a efectivo, el movimiento se borra y se le devuelve el
// monto a la tarjeta.
async function guardarMensual(req, res) {
  const { gastoFijoConfigId, anio, mes, montoEstimado, montoReal, fuente, tarjetaId, cuenta, aportesExternos, cuentaOrigenId, cuentaDestinoId } = req.body;

  if (!gastoFijoConfigId || !anio || !mes) {
    return res.status(400).json({ error: "gastoFijoConfigId, anio y mes son requeridos" });
  }

  let estimadoNum = null;
  if (montoEstimado !== undefined && montoEstimado !== null) {
    estimadoNum = Number(montoEstimado);
    if (!Number.isFinite(estimadoNum) || estimadoNum < 0) {
      return res.status(400).json({ error: "montoEstimado debe ser un número mayor o igual a 0" });
    }
  }
  let realNum = null;
  if (montoReal !== undefined && montoReal !== null) {
    realNum = Number(montoReal);
    if (!Number.isFinite(realNum) || realNum < 0) {
      return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
    }
  }
  if (fuente !== undefined && !FUENTES_VALIDAS.includes(fuente)) {
    return res.status(400).json({ error: `fuente debe ser una de: ${FUENTES_VALIDAS.join(", ")}` });
  }
  if (fuente === "TARJETA" && !tarjetaId) {
    return res.status(400).json({ error: "tarjetaId es requerido cuando fuente es TARJETA" });
  }
  if (fuente === "CUENTA_BANCO" && !CUENTAS_VALIDAS.includes(cuenta)) {
    return res.status(400).json({ error: `cuenta debe ser una de: ${CUENTAS_VALIDAS.join(", ")}` });
  }

  const config = await prisma.gastoFijoConfig.findUnique({ where: { id: Number(gastoFijoConfigId) } });
  if (!config || config.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }
  if (tarjetaId) {
    const tarjeta = await prisma.tarjetaCredito.findUnique({ where: { id: Number(tarjetaId) } });
    if (!tarjeta || tarjeta.usuarioId !== req.usuarioId) {
      return res.status(404).json({ error: "Tarjeta no encontrada" });
    }
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  const existente = await prisma.gastoFijoMensual.findUnique({
    where: { presupuestoId_gastoFijoConfigId: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id } },
    include: { movimientoTarjeta: true, movimientoCuenta: true, aportesExternos: true },
  });
  const cuentaEfectivo = await obtenerCuentaEfectivo(req.usuarioId);

  const montoRealFinal = realNum ?? Number(existente?.montoReal || 0);
  const aportesNum = parsearAportesExternos(aportesExternos, montoRealFinal);
  if (aportesNum === null) {
    return res.status(400).json({ error: "aportesExternos debe ser una lista de montos válidos que no superen el montoReal" });
  }

  // Apartar plata al momento de cargar a la tarjeta (opcional, solo la
  // primera vez que se vincula — igual que en gasto variable): si se manda
  // cuentaOrigenId, se transfiere el monto completo de ahi a la cuenta del
  // banco de la tarjeta.
  const fuenteFinalGF = fuente !== undefined ? fuente : existente?.fuente;
  const tarjetaIdFinalGF = tarjetaId !== undefined ? (tarjetaId ? Number(tarjetaId) : null) : existente?.tarjetaId;
  let reservaGF = null;
  if (!existente?.movimientoTarjeta && fuenteFinalGF === "TARJETA" && tarjetaIdFinalGF && montoRealFinal > 0 && cuentaOrigenId) {
    const cuentaOrigen = await validarCuentaPropia(req.usuarioId, Number(cuentaOrigenId));
    if (!cuentaOrigen) return res.status(404).json({ error: "Cuenta origen no encontrada" });
    if (montoRealFinal > Number(cuentaOrigen.saldoActual)) {
      return res.status(400).json({ error: "El monto supera el saldo disponible en la cuenta origen" });
    }
    const destino = await resolverCuentaDestinoReserva(tarjetaIdFinalGF, cuentaDestinoId ? Number(cuentaDestinoId) : null);
    if (!destino.ok) return res.status(400).json({ error: destino.error, opciones: destino.opciones });
    if (destino.cuenta.id === cuentaOrigen.id) {
      return res.status(400).json({ error: "La cuenta origen y destino no pueden ser la misma" });
    }
    reservaGF = { cuentaOrigen, cuentaDestino: destino.cuenta };
  }

  const data = {};
  if (estimadoNum !== null) data.montoEstimado = estimadoNum;
  if (realNum !== null) data.montoReal = realNum;
  if (fuente !== undefined) data.fuente = fuente;
  if (tarjetaId !== undefined) data.tarjetaId = tarjetaId ? Number(tarjetaId) : null;
  if (cuenta !== undefined) data.cuenta = cuenta || null;

  const registro = await prisma.$transaction(async (tx) => {
    const guardado = await tx.gastoFijoMensual.upsert({
      where: { presupuestoId_gastoFijoConfigId: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id } },
      update: data,
      create: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id, ...data },
    });

    if (estimadoNum !== null) {
      await tx.gastoFijoConfig.update({ where: { id: config.id }, data: { montoEstimado: estimadoNum } });
    }

    if (aportesExternos !== undefined) {
      await tx.aporteExterno.deleteMany({ where: { gastoFijoMensualId: guardado.id } });
      if (aportesNum.length > 0) {
        await tx.aporteExterno.createMany({
          data: aportesNum.map((monto) => ({ gastoFijoMensualId: guardado.id, monto })),
        });
      }
    }

    const movimientoPrevio = existente?.movimientoTarjeta;
    const montoFinal = guardado.montoReal ? Number(guardado.montoReal) : 0;

    if (guardado.fuente === "TARJETA" && guardado.tarjetaId && montoFinal > 0) {
      if (movimientoPrevio && movimientoPrevio.tarjetaId === guardado.tarjetaId) {
        const delta = montoFinal - Number(movimientoPrevio.monto);
        if (delta !== 0) {
          await tx.movimientoTarjeta.update({ where: { id: movimientoPrevio.id }, data: { monto: montoFinal } });
          await tx.tarjetaCredito.update({ where: { id: guardado.tarjetaId }, data: { saldoActual: { increment: delta } } });
        }
      } else if (movimientoPrevio) {
        await tx.tarjetaCredito.update({
          where: { id: movimientoPrevio.tarjetaId },
          data: { saldoActual: { decrement: Number(movimientoPrevio.monto) } },
        });
        await tx.movimientoTarjeta.update({
          where: { id: movimientoPrevio.id },
          data: { monto: montoFinal, tarjetaId: guardado.tarjetaId },
        });
        await tx.tarjetaCredito.update({ where: { id: guardado.tarjetaId }, data: { saldoActual: { increment: montoFinal } } });
      } else {
        await tx.movimientoTarjeta.create({
          data: {
            tarjetaId: guardado.tarjetaId,
            monto: montoFinal,
            fecha: hoyElSalvador(),
            descripcion: config.nombre,
            gastoFijoMensualId: guardado.id,
          },
        });
        await tx.tarjetaCredito.update({ where: { id: guardado.tarjetaId }, data: { saldoActual: { increment: montoFinal } } });
        if (reservaGF) {
          await ejecutarReserva(tx, {
            cuentaOrigen: reservaGF.cuentaOrigen,
            cuentaDestino: reservaGF.cuentaDestino,
            monto: montoFinal,
            descripcion: config.nombre,
            fecha: hoyElSalvador(),
            vinculo: { gastoFijoMensualId: guardado.id },
          });
        }
      }
    } else if (movimientoPrevio) {
      await tx.movimientoTarjeta.delete({ where: { id: movimientoPrevio.id } });
      await tx.tarjetaCredito.update({
        where: { id: movimientoPrevio.tarjetaId },
        data: { saldoActual: { decrement: Number(movimientoPrevio.monto) } },
      });
    }

    // Mismo patrón que arriba pero para la billetera de efectivo: no hay
    // "cambio de destino" posible (solo existe una billetera por usuario),
    // así que solo hace falta crear/ajustar-por-delta/borrar el vínculo.
    const movimientoCuentaPrevio = existente?.movimientoCuenta;
    if (guardado.fuente === "EFECTIVO" && montoFinal > 0 && cuentaEfectivo) {
      const montoVinculado = -montoFinal;
      if (movimientoCuentaPrevio) {
        const delta = montoVinculado - Number(movimientoCuentaPrevio.monto);
        if (delta !== 0) {
          await tx.movimientoCuenta.update({ where: { id: movimientoCuentaPrevio.id }, data: { monto: montoVinculado } });
          await tx.cuentaBancaria.update({ where: { id: cuentaEfectivo.id }, data: { saldoActual: { increment: delta } } });
        }
      } else {
        await tx.movimientoCuenta.create({
          data: {
            cuentaId: cuentaEfectivo.id,
            monto: montoVinculado,
            fecha: hoyElSalvador(),
            descripcion: config.nombre,
            gastoFijoMensualId: guardado.id,
          },
        });
        await tx.cuentaBancaria.update({ where: { id: cuentaEfectivo.id }, data: { saldoActual: { decrement: montoFinal } } });
      }
    } else if (movimientoCuentaPrevio) {
      await tx.movimientoCuenta.delete({ where: { id: movimientoCuentaPrevio.id } });
      await tx.cuentaBancaria.update({
        where: { id: movimientoCuentaPrevio.cuentaId },
        data: { saldoActual: { decrement: Number(movimientoCuentaPrevio.monto) } },
      });
    }

    return tx.gastoFijoMensual.findUnique({ where: { id: guardado.id }, include: { aportesExternos: true } });
  }, { timeout: 15000 });

  res.json({ registro });
}

// Quita SOLO el registro de este mes (estimado + real + fuente + vinculos)
// sin tocar el GastoFijoConfig ni otros meses — a diferencia de eliminarConfig
// (boton rojo), esto es reversible con solo volver a agregarlo el mes que
// entra, y el gasto sigue apareciendo como sugerencia despues. Si tenia un
// movimiento de tarjeta o de cuenta vinculado (ya pagado con tarjeta o
// efectivo), se revierte el saldo correspondiente antes de borrar, igual
// que al eliminar una transaccion.
async function eliminarMensual(req, res) {
  const gastoFijoConfigId = Number(req.params.gastoFijoConfigId);
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const config = await prisma.gastoFijoConfig.findUnique({ where: { id: gastoFijoConfigId } });
  if (!config || config.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  if (!presupuesto) return res.status(204).send();

  const existente = await prisma.gastoFijoMensual.findUnique({
    where: { presupuestoId_gastoFijoConfigId: { presupuestoId: presupuesto.id, gastoFijoConfigId } },
    include: { movimientoTarjeta: true, movimientoCuenta: true },
  });
  if (!existente) return res.status(204).send();

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
    await tx.gastoFijoMensual.delete({ where: { id: existente.id } });
  }, { timeout: 15000 });

  res.status(204).send();
}

module.exports = { listarConfig, crearConfig, actualizarConfig, eliminarConfig, listarMensual, guardarMensual, eliminarMensual };
