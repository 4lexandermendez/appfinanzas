const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");
const { listarCategorias } = require("./categoriaService");
const { calcularEstimadoMes } = require("./estimadoTrackerService");
const { calcularResumenReal } = require("./resumenTrackerService");

// El schema (sección 5 de PLANIFICACION.md) no modela un "estimado" para
// categorías variables genéricas, solo para Transporte y Comida (vía el
// tracker diario + Ajustes). Para el resto de categorías, "estimado" queda
// en null en vez de mostrar 0, para no simular un dato que no existe.
async function calcularResumenMes(usuarioId, anio, mes) {
  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId, anio, mes } },
  });

  const [ingresos, ahorros, gastosFijosConfig, gastosFijosMensual, transacciones] = await Promise.all([
    presupuesto ? prisma.ingreso.findMany({ where: { presupuestoId: presupuesto.id } }) : [],
    presupuesto ? prisma.ahorro.findMany({ where: { presupuestoId: presupuesto.id } }) : [],
    prisma.gastoFijoConfig.findMany({ where: { usuarioId, activo: true } }),
    presupuesto ? prisma.gastoFijoMensual.findMany({ where: { presupuestoId: presupuesto.id } }) : [],
    presupuesto ? prisma.transaccion.findMany({ where: { presupuestoId: presupuesto.id } }) : [],
  ]);

  const ingresosResumen = {
    estimado: redondear(ingresos.reduce((s, i) => s + Number(i.montoEstimado), 0)),
    real: redondear(ingresos.reduce((s, i) => s + Number(i.montoReal || 0), 0)),
  };
  const ahorrosResumen = {
    estimado: redondear(ahorros.reduce((s, a) => s + Number(a.montoEstimado), 0)),
    real: redondear(ahorros.reduce((s, a) => s + Number(a.montoReal || 0), 0)),
  };
  const gastosFijosResumen = {
    estimado: redondear(gastosFijosConfig.reduce((s, g) => s + Number(g.montoEstimado), 0)),
    real: redondear(gastosFijosMensual.reduce((s, g) => s + Number(g.montoReal || 0), 0)),
  };

  const categorias = await listarCategorias(usuarioId);
  const realPorCategoria = new Map();
  for (const t of transacciones) {
    const previo = realPorCategoria.get(t.categoriaId) || 0;
    realPorCategoria.set(t.categoriaId, previo + Number(t.monto));
  }

  const resumenTracker = await calcularResumenReal(usuarioId, anio, mes);
  const estimadoTracker = await calcularEstimadoMes(usuarioId, anio, mes);

  let transporteEstimado = null;
  let comidaEstimado = null;
  if (estimadoTracker) {
    transporteEstimado = redondear(
      estimadoTracker.totalPorConcepto.PASAJE_IDA + estimadoTracker.totalPorConcepto.PASAJE_REGRESO
    );
    comidaEstimado = redondear(
      estimadoTracker.totalPorConcepto.DESAYUNO + estimadoTracker.totalPorConcepto.ALMUERZO
    );
  }

  const porCategoria = categorias.map((c) => {
    let real = redondear(realPorCategoria.get(c.id) || 0);
    let estimado = null;
    if (c.esDefault && c.nombre === "Transporte") {
      real = redondear(real + resumenTracker.transporteReal);
      estimado = transporteEstimado;
    }
    if (c.esDefault && c.nombre === "Comida") {
      real = redondear(real + resumenTracker.comidaReal);
      estimado = comidaEstimado;
    }
    return { categoriaId: c.id, nombre: c.nombre, real, estimado };
  });

  const gastosVariablesResumen = {
    real: redondear(porCategoria.reduce((s, c) => s + c.real, 0)),
    estimadoConocido: redondear(porCategoria.reduce((s, c) => s + (c.estimado || 0), 0)),
    porCategoria,
  };

  return {
    ingresos: ingresosResumen,
    ahorros: ahorrosResumen,
    gastosFijos: gastosFijosResumen,
    gastosVariables: gastosVariablesResumen,
  };
}

module.exports = { calcularResumenMes };
