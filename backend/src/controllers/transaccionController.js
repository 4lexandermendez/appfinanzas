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

  const transaccion = await prisma.transaccion.create({
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

  res.status(201).json({ transaccion });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.transaccion.findUnique({
    where: { id },
    include: { presupuesto: true },
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

  const transaccion = await prisma.transaccion.update({
    where: { id },
    data,
    include: { categoria: true },
  });

  res.json({ transaccion });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.transaccion.findUnique({
    where: { id },
    include: { presupuesto: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Transacción no encontrada" });
  }

  await prisma.transaccion.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
