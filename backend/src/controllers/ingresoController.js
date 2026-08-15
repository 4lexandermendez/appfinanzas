const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");
const { validarCuentaPropia } = require("../services/cuentaEfectivoService");
const { hoyElSalvador } = require("../utils/fecha");

async function listar(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });
  if (!presupuesto) return res.json({ ingresos: [] });

  const ingresos = await prisma.ingreso.findMany({
    where: { presupuestoId: presupuesto.id },
    orderBy: { id: "asc" },
  });
  res.json({ ingresos });
}

async function crear(req, res) {
  const { anio, mes, nombre, montoEstimado, montoReal, fecha, cuentaId } = req.body;

  if (!anio || !mes || !nombre || !nombre.trim() || montoEstimado === undefined) {
    return res.status(400).json({ error: "anio, mes, nombre y montoEstimado son requeridos" });
  }
  const estimadoNum = Number(montoEstimado);
  if (!Number.isFinite(estimadoNum) || estimadoNum <= 0) {
    return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
  }
  let realNum = null;
  if (montoReal !== undefined && montoReal !== null) {
    realNum = Number(montoReal);
    if (!Number.isFinite(realNum) || realNum < 0) {
      return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
    }
  }
  let cuenta = null;
  if (cuentaId) {
    cuenta = await validarCuentaPropia(req.usuarioId, Number(cuentaId));
    if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  // Si se vincula a una cuenta (ej. el BAC) y ya viene con un Real, se
  // refleja de una vez como un depósito en el saldo de esa cuenta — igual
  // que un gasto pagado con tarjeta ya refleja su movimiento sin registrarlo
  // dos veces.
  const ingreso = await prisma.$transaction(async (tx) => {
    const creado = await tx.ingreso.create({
      data: {
        presupuestoId: presupuesto.id,
        nombre: nombre.trim(),
        montoEstimado: estimadoNum,
        montoReal: realNum,
        fecha: fecha ? new Date(fecha) : null,
        cuentaId: cuenta ? cuenta.id : null,
      },
    });

    if (cuenta && realNum && realNum > 0) {
      await tx.movimientoCuenta.create({
        data: {
          cuentaId: cuenta.id,
          monto: realNum,
          fecha: hoyElSalvador(),
          descripcion: creado.nombre,
          ingresoId: creado.id,
        },
      });
      await tx.cuentaBancaria.update({ where: { id: cuenta.id }, data: { saldoActual: { increment: realNum } } });
    }

    return creado;
  }, { timeout: 15000 });
  res.status(201).json({ ingreso });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.ingreso.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoCuenta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Ingreso no encontrado" });
  }

  const { nombre, montoEstimado, montoReal, fecha, cuentaId } = req.body;
  const data = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
    data.nombre = nombre.trim();
  }
  if (montoEstimado !== undefined) {
    const estimadoNum = Number(montoEstimado);
    if (!Number.isFinite(estimadoNum) || estimadoNum <= 0) {
      return res.status(400).json({ error: "montoEstimado debe ser un número mayor a 0" });
    }
    data.montoEstimado = estimadoNum;
  }
  if (montoReal !== undefined) {
    if (montoReal === null) {
      data.montoReal = null;
    } else {
      const realNum = Number(montoReal);
      if (!Number.isFinite(realNum) || realNum < 0) {
        return res.status(400).json({ error: "montoReal debe ser un número mayor o igual a 0" });
      }
      data.montoReal = realNum;
    }
  }
  if (fecha !== undefined) data.fecha = fecha ? new Date(fecha) : null;

  if (cuentaId !== undefined) {
    if (cuentaId === null) {
      data.cuentaId = null;
    } else {
      const cuenta = await validarCuentaPropia(req.usuarioId, Number(cuentaId));
      if (!cuenta) return res.status(404).json({ error: "Cuenta no encontrada" });
      data.cuentaId = cuenta.id;
    }
  }

  const cuentaIdFinal = data.cuentaId !== undefined ? data.cuentaId : existente.cuentaId;
  const montoRealFinal = data.montoReal !== undefined
    ? data.montoReal
    : existente.montoReal !== null
      ? Number(existente.montoReal)
      : null;

  // Igual que el vínculo de gasto fijo con tarjeta: si ya había un depósito
  // vinculado, se ajusta por delta (o se mueve si cambió de cuenta); si no
  // hay cuenta o el Real se borra, se revierte y se elimina el vínculo.
  const ingreso = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.ingreso.update({ where: { id }, data });

    const movimientoPrevio = existente.movimientoCuenta;
    if (cuentaIdFinal && montoRealFinal && montoRealFinal > 0) {
      if (movimientoPrevio && movimientoPrevio.cuentaId === cuentaIdFinal) {
        const delta = montoRealFinal - Number(movimientoPrevio.monto);
        if (delta !== 0) {
          await tx.movimientoCuenta.update({ where: { id: movimientoPrevio.id }, data: { monto: montoRealFinal } });
          await tx.cuentaBancaria.update({ where: { id: cuentaIdFinal }, data: { saldoActual: { increment: delta } } });
        }
      } else if (movimientoPrevio) {
        await tx.cuentaBancaria.update({
          where: { id: movimientoPrevio.cuentaId },
          data: { saldoActual: { decrement: Number(movimientoPrevio.monto) } },
        });
        await tx.movimientoCuenta.update({
          where: { id: movimientoPrevio.id },
          data: { monto: montoRealFinal, cuentaId: cuentaIdFinal },
        });
        await tx.cuentaBancaria.update({ where: { id: cuentaIdFinal }, data: { saldoActual: { increment: montoRealFinal } } });
      } else {
        await tx.movimientoCuenta.create({
          data: {
            cuentaId: cuentaIdFinal,
            monto: montoRealFinal,
            fecha: hoyElSalvador(),
            descripcion: actualizado.nombre,
            ingresoId: id,
          },
        });
        await tx.cuentaBancaria.update({ where: { id: cuentaIdFinal }, data: { saldoActual: { increment: montoRealFinal } } });
      }
    } else if (movimientoPrevio) {
      await tx.movimientoCuenta.delete({ where: { id: movimientoPrevio.id } });
      await tx.cuentaBancaria.update({
        where: { id: movimientoPrevio.cuentaId },
        data: { saldoActual: { decrement: Number(movimientoPrevio.monto) } },
      });
    }

    return actualizado;
  }, { timeout: 15000 });
  res.json({ ingreso });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.ingreso.findUnique({
    where: { id },
    include: { presupuesto: true, movimientoCuenta: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Ingreso no encontrado" });
  }

  await prisma.$transaction(async (tx) => {
    if (existente.movimientoCuenta) {
      await tx.movimientoCuenta.delete({ where: { id: existente.movimientoCuenta.id } });
      await tx.cuentaBancaria.update({
        where: { id: existente.movimientoCuenta.cuentaId },
        data: { saldoActual: { decrement: Number(existente.movimientoCuenta.monto) } },
      });
    }
    await tx.ingreso.delete({ where: { id } });
  }, { timeout: 15000 });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
