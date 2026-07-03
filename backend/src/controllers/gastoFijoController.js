const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

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
  const hoy = new Date();
  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, hoy.getFullYear(), hoy.getMonth() + 1);
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
    ? await prisma.gastoFijoMensual.findMany({ where: { presupuestoId: presupuesto.id } })
    : [];
  const registroPorConfig = new Map(registrosMensuales.map((r) => [r.gastoFijoConfigId, r]));

  const gastosFijos = [];
  const sugerencias = [];
  for (const c of configTodos) {
    const registro = registroPorConfig.get(c.id);
    if (registro) {
      gastosFijos.push({
        gastoFijoConfigId: c.id,
        nombre: c.nombre,
        montoEstimado: registro.montoEstimado ?? c.montoEstimado,
        montoReal: registro.montoReal,
      });
    } else if (c.activo) {
      sugerencias.push({ gastoFijoConfigId: c.id, nombre: c.nombre, montoSugerido: c.montoEstimado });
    }
  }

  res.json({ gastosFijos, sugerencias });
}

// Se usa tanto para "seleccionar" un gasto fijo sugerido en el mes (mandando
// montoEstimado) como para marcar el Real ya pagado. El montoEstimado, si
// viene, también actualiza la config para que sea el monto sugerido la
// próxima vez (ej. subiste de Netflix $15 a $18, el próximo mes sugiere $18).
async function guardarMensual(req, res) {
  const { gastoFijoConfigId, anio, mes, montoEstimado, montoReal } = req.body;

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

  const config = await prisma.gastoFijoConfig.findUnique({ where: { id: Number(gastoFijoConfigId) } });
  if (!config || config.usuarioId !== req.usuarioId) {
    return res.status(404).json({ error: "Gasto fijo no encontrado" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));

  const data = {};
  if (estimadoNum !== null) data.montoEstimado = estimadoNum;
  if (realNum !== null) data.montoReal = realNum;

  const acciones = [
    prisma.gastoFijoMensual.upsert({
      where: { presupuestoId_gastoFijoConfigId: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id } },
      update: data,
      create: { presupuestoId: presupuesto.id, gastoFijoConfigId: config.id, ...data },
    }),
  ];
  if (estimadoNum !== null) {
    acciones.push(prisma.gastoFijoConfig.update({ where: { id: config.id }, data: { montoEstimado: estimadoNum } }));
  }
  const [registro] = await prisma.$transaction(acciones);

  res.json({ registro });
}

module.exports = { listarConfig, crearConfig, actualizarConfig, eliminarConfig, listarMensual, guardarMensual };
