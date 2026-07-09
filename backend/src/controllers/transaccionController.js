const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

const FUENTES_VALIDAS = ["EFECTIVO", "TARJETA"];

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
    include: { categoria: true },
    orderBy: { fecha: "desc" },
  });

  res.json({ transacciones });
}

async function crear(req, res) {
  const { categoriaId, monto, fecha, notas, fuente, tarjetaId } = req.body;

  if (!categoriaId || monto === undefined || !fecha) {
    return res.status(400).json({ error: "categoriaId, monto y fecha son requeridos" });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "monto debe ser un número mayor a 0" });
  }
  const fechaParsed = parseFecha(fecha);
  if (!fechaParsed) {
    return res.status(400).json({ error: "fecha inválida" });
  }
  const fuenteFinal = fuente ?? "EFECTIVO";
  if (!FUENTES_VALIDAS.includes(fuenteFinal)) {
    return res.status(400).json({ error: "fuente debe ser EFECTIVO o TARJETA" });
  }
  if (fuenteFinal === "TARJETA" && !tarjetaId) {
    return res.status(400).json({ error: "tarjetaId es requerido cuando fuente es TARJETA" });
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

  // Si se paga con tarjeta, ademas de la transaccion se crea el movimiento
  // en la tarjeta (vinculado via transaccionId) y se suma el monto al saldo
  // — asi el gasto variable pagado con tarjeta ya queda reflejado ahi, sin
  // tener que registrarlo dos veces.
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
      },
      include: { categoria: true },
    });

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
    }

    return creada;
  });

  res.status(201).json({ transaccion });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.transaccion.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoTarjeta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Transacción no encontrada" });
  }

  const { categoriaId, monto, fecha, notas, fuente, tarjetaId } = req.body;
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
      return res.status(400).json({ error: "fuente debe ser EFECTIVO o TARJETA" });
    }
    data.fuente = fuente;
  }

  if (tarjetaId !== undefined) {
    if (tarjetaId !== null && !(await validarTarjeta(req.usuarioId, Number(tarjetaId)))) {
      return res.status(404).json({ error: "Tarjeta no encontrada" });
    }
    data.tarjetaId = tarjetaId ? Number(tarjetaId) : null;
  }

  // Si esta transaccion ya tenia un movimiento en una tarjeta vinculado y
  // cambia el monto o la fecha, se actualiza tambien el movimiento y se
  // ajusta el saldo de la tarjeta por la diferencia, para que no queden
  // desincronizados.
  const transaccion = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.transaccion.update({ where: { id }, data, include: { categoria: true } });

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

    return actualizada;
  });

  res.json({ transaccion });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.transaccion.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoTarjeta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Transacción no encontrada" });
  }

  // Si tiene un movimiento de tarjeta vinculado hay que borrarlo primero
  // (la FK no tiene cascade) y devolver el monto al saldo de la tarjeta.
  await prisma.$transaction(async (tx) => {
    if (existente.movimientoTarjeta) {
      await tx.movimientoTarjeta.delete({ where: { id: existente.movimientoTarjeta.id } });
      await tx.tarjetaCredito.update({
        where: { id: existente.movimientoTarjeta.tarjetaId },
        data: { saldoActual: { decrement: Number(existente.movimientoTarjeta.monto) } },
      });
    }
    await tx.transaccion.delete({ where: { id } });
  });

  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
