const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");
const { formatDateKey } = require("../utils/fecha");
const { estaVigenteEnMes } = require("../utils/vigencia");
const { calcularEstimadoMesPuro } = require("./estimadoTrackerService");
const { listarCategorias } = require("./categoriaService");

function seccionVacia() {
  return {
    meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, estimado: 0, real: 0 })),
    total: { estimado: 0, real: 0 },
  };
}

function agregarMes(seccion, mes, estimado, real) {
  seccion.meses[mes - 1] = { mes, estimado, real };
  seccion.total.estimado = redondear(seccion.total.estimado + estimado);
  seccion.total.real = redondear(seccion.total.real + real);
}

function sumar(lista, campo) {
  return redondear(lista.reduce((s, x) => s + Number(x[campo] || 0), 0));
}

// Replica la hoja "Resumen del Año" del Excel original: 5 tablas
// (Ingresos, Ahorros, Gastos fijos, Gastos variables, Deudas), cada una
// con Estimado y Real mes a mes, más los totales del año.
//
// Trae todos los datos del año en un puñado de consultas (no 12 rondas por
// mes) para que la latencia contra la base remota sea manejable.
async function calcularResumenAnualCompleto(usuarioId, anio) {
  const inicioAnio = new Date(Date.UTC(anio, 0, 1));
  const finAnio = new Date(Date.UTC(anio, 11, 31));

  const [ajuste, diasLibres, presupuestos, gastosFijosConfig, categorias] = await Promise.all([
    prisma.ajusteTracker.findUnique({ where: { usuarioId } }),
    prisma.diaLibre.findMany({ where: { usuarioId, fecha: { gte: inicioAnio, lte: finAnio } } }),
    prisma.presupuestoMensual.findMany({
      where: { usuarioId, anio },
      include: {
        ingresos: true,
        ahorros: true,
        gastosFijosMes: true,
        deudasMes: true,
        transacciones: true,
        trackerDiario: true,
        categoriasVariablesMes: true,
      },
    }),
    prisma.gastoFijoConfig.findMany({ where: { usuarioId } }),
    listarCategorias(usuarioId),
  ]);

  const diasLibresSet = new Set(diasLibres.map((d) => formatDateKey(d.fecha)));
  const idsTransporteComida = new Set(
    categorias.filter((c) => c.esDefault && (c.nombre === "Transporte" || c.nombre === "Comida")).map((c) => c.id)
  );

  const resultado = {
    anio,
    ingresos: seccionVacia(),
    ahorros: seccionVacia(),
    gastosFijos: seccionVacia(),
    gastosVariables: seccionVacia(),
    deudas: seccionVacia(),
  };

  for (let mes = 1; mes <= 12; mes++) {
    const p = presupuestos.find((x) => x.mes === mes);

    agregarMes(resultado.ingresos, mes, sumar(p?.ingresos || [], "montoEstimado"), sumar(p?.ingresos || [], "montoReal"));
    agregarMes(resultado.ahorros, mes, sumar(p?.ahorros || [], "montoEstimado"), sumar(p?.ahorros || [], "montoReal"));
    const gastosFijosVigentes = gastosFijosConfig.filter((g) => estaVigenteEnMes(g, anio, mes));
    agregarMes(
      resultado.gastosFijos,
      mes,
      sumar(gastosFijosVigentes, "montoEstimado"),
      sumar(p?.gastosFijosMes || [], "montoReal")
    );
    agregarMes(resultado.deudas, mes, sumar(p?.deudasMes || [], "montoEstimado"), sumar(p?.deudasMes || [], "montoReal"));

    let transporteEstimado = 0;
    let comidaEstimado = 0;
    if (ajuste) {
      const est = calcularEstimadoMesPuro(ajuste, diasLibresSet, anio, mes);
      transporteEstimado = redondear(est.totalPorConcepto.PASAJE_IDA + est.totalPorConcepto.PASAJE_REGRESO);
      comidaEstimado = redondear(est.totalPorConcepto.DESAYUNO + est.totalPorConcepto.ALMUERZO);
    }
    const estimadoManual = sumar(
      (p?.categoriasVariablesMes || []).filter((c) => !idsTransporteComida.has(c.categoriaId)),
      "montoEstimado"
    );
    const gastosVariablesEstimado = redondear(transporteEstimado + comidaEstimado + estimadoManual);
    const gastosVariablesReal = redondear(sumar(p?.transacciones || [], "monto") + sumar(p?.trackerDiario || [], "monto"));

    agregarMes(resultado.gastosVariables, mes, gastosVariablesEstimado, gastosVariablesReal);
  }

  return resultado;
}

module.exports = { calcularResumenAnualCompleto };
