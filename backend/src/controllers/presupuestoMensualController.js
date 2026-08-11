const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

// El campo "notas" (texto suelto) de PresupuestoMensual queda sin usar a
// partir de las hojas tipo pestañas de abajo, pero no se migra en una sola
// pasada: se va migrando perezosamente, mes por mes, la primera vez que se
// pide o se toca ese mes — asi no hace falta un script de backfill aparte.
async function migrarHojaLegado(presupuestoId, contenidoLegado) {
  if (!contenidoLegado) return;
  const existentes = await prisma.notaPresupuesto.count({ where: { presupuestoId } });
  if (existentes === 0) {
    await prisma.notaPresupuesto.create({
      data: { presupuestoId, orden: 1, contenido: contenidoLegado },
    });
  }
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
    return res.json({ notas: [{ id: null, orden: 1, contenido: "" }] });
  }

  const hojas = await prisma.notaPresupuesto.findMany({
    where: { presupuestoId: presupuesto.id },
    orderBy: { orden: "asc" },
  });
  if (hojas.length > 0) {
    return res.json({ notas: hojas });
  }

  // Todavia no hay pestañas: se muestra el texto viejo como la primera,
  // sin persistir hasta que el usuario la edite o agregue otra.
  res.json({ notas: [{ id: null, orden: 1, contenido: presupuesto.notas || "" }] });
}

async function guardar(req, res) {
  const { anio, mes, orden, contenido } = req.body;
  const ordenNum = Number(orden);
  if (!anio || !mes || !Number.isInteger(ordenNum) || ordenNum < 1) {
    return res.status(400).json({ error: "anio, mes y orden son requeridos" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));
  await migrarHojaLegado(presupuesto.id, presupuesto.notas);

  // El guardado automatico al salir del campo y la confirmacion de una
  // pestaña recien creada pueden llegar casi juntos y chocar contra la
  // misma restriccion unica (presupuestoId+orden) — si eso pasa, se
  // reintenta como actualizacion en vez de fallar.
  let hoja;
  try {
    hoja = await prisma.notaPresupuesto.upsert({
      where: { presupuestoId_orden: { presupuestoId: presupuesto.id, orden: ordenNum } },
      update: { contenido: contenido || null },
      create: { presupuestoId: presupuesto.id, orden: ordenNum, contenido: contenido || null },
    });
  } catch (err) {
    if (err.code !== "P2002") throw err;
    hoja = await prisma.notaPresupuesto.update({
      where: { presupuestoId_orden: { presupuestoId: presupuesto.id, orden: ordenNum } },
      data: { contenido: contenido || null },
    });
  }

  res.json({ nota: hoja });
}

async function crear(req, res) {
  const { anio, mes } = req.body;
  if (!anio || !mes) {
    return res.status(400).json({ error: "anio y mes son requeridos" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));
  await migrarHojaLegado(presupuesto.id, presupuesto.notas);

  // Buscar el ultimo "orden" y crear la siguiente pestaña no es atomico: si
  // el guardado automatico de la pestaña activa (onBlur) y el click de "+"
  // llegan casi juntos, los dos pueden calcular el mismo siguiente numero
  // antes de que el otro termine de guardar. Se reintenta con un numero
  // recalculado si eso choca contra la restriccion unica.
  for (let intento = 0; intento < 5; intento++) {
    const ultima = await prisma.notaPresupuesto.findFirst({
      where: { presupuestoId: presupuesto.id },
      orderBy: { orden: "desc" },
    });
    const siguienteOrden = (ultima?.orden || 0) + 1;

    try {
      const hoja = await prisma.notaPresupuesto.create({
        data: { presupuestoId: presupuesto.id, orden: siguienteOrden, contenido: "" },
      });
      return res.status(201).json({ nota: hoja });
    } catch (err) {
      if (err.code === "P2002" && intento < 4) continue;
      throw err;
    }
  }
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const existente = await prisma.notaPresupuesto.findUnique({
    where: { id },
    include: { presupuesto: true },
  });
  if (!existente || existente.presupuesto.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  const total = await prisma.notaPresupuesto.count({ where: { presupuestoId: existente.presupuestoId } });
  if (total <= 1) {
    return res.status(400).json({ error: "Debe quedar al menos una pestaña de notas" });
  }

  await prisma.notaPresupuesto.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { listar, guardar, crear, eliminar };
