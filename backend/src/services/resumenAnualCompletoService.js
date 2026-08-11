const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");
const { formatDateKey, hoyElSalvador } = require("../utils/fecha");
const { calcularEstimadoMesPuro } = require("./estimadoTrackerService");
const { listarCategorias } = require("./categoriaService");
const { estaVigenteEnMes } = require("../utils/vigencia");

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

// Igual que sumar(), pero restando los aportes externos de cada item (plata
// que puso otra persona, no cuenta contra el Real del usuario).
function sumarNeto(lista, campo) {
  return redondear(
    lista.reduce((s, x) => {
      const aportes = (x.aportesExternos || []).reduce((sa, a) => sa + Number(a.monto), 0);
      return s + Number(x[campo] || 0) - aportes;
    }, 0)
  );
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

  const [ajusteVersiones, diasLibres, presupuestos, categorias, deudasConfig] = await Promise.all([
    prisma.ajusteTracker.findMany({ where: { usuarioId }, orderBy: { creadoEn: "asc" } }),
    prisma.diaLibre.findMany({ where: { usuarioId, fecha: { gte: inicioAnio, lte: finAnio } } }),
    prisma.presupuestoMensual.findMany({
      where: { usuarioId, anio },
      include: {
        ingresos: true,
        ahorros: true,
        gastosFijosMes: { include: { aportesExternos: true } },
        deudasMes: true,
        transacciones: { include: { aportesExternos: true } },
        trackerDiario: true,
        categoriasVariablesMes: true,
      },
    }),
    listarCategorias(usuarioId),
    prisma.deudaConfig.findMany({ where: { usuarioId } }),
  ]);

  // El Estimado de una deuda solo queda guardado (DeudaMensual) si el
  // usuario llego a tocar ese campo en Presupuesto — si no, ahi se sugiere
  // el saldo pendiente actual (ver deudaController.listarMensual) pero eso
  // nunca se escribe a la base. Para que el mes actual del Año no se vea en
  // $0 por esto, se replica la misma sugerencia aca, solo para el mes de
  // hoy (los meses pasados/futuros no tienen un "saldo pendiente de hoy"
  // que tenga sentido aplicarles retroactivamente).
  const hoy = hoyElSalvador();
  const anioActual = hoy.getUTCFullYear();
  const mesActual = hoy.getUTCMonth() + 1;
  const deudasVigentesHoy =
    anio === anioActual
      ? deudasConfig.filter((d) => estaVigenteEnMes(d, anio, mesActual) && Number(d.saldoActual) > 0)
      : [];

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
    agregarMes(
      resultado.gastosFijos,
      mes,
      sumar(p?.gastosFijosMes || [], "montoEstimado"),
      sumarNeto(p?.gastosFijosMes || [], "montoReal")
    );
    let deudasEstimado = sumar(p?.deudasMes || [], "montoEstimado");
    if (mes === mesActual && anio === anioActual) {
      const deudasPorConfig = new Map((p?.deudasMes || []).map((d) => [d.deudaConfigId, d]));
      deudasEstimado = redondear(
        deudasVigentesHoy.reduce(
          (s, d) => s + Number(deudasPorConfig.get(d.id)?.montoEstimado ?? d.saldoActual),
          0
        )
      );
    }
    agregarMes(resultado.deudas, mes, deudasEstimado, sumar(p?.deudasMes || [], "montoReal"));

    let transporteEstimado = 0;
    let comidaEstimado = 0;
    if (ajusteVersiones.length > 0) {
      const est = calcularEstimadoMesPuro(ajusteVersiones, diasLibresSet, anio, mes);
      transporteEstimado = redondear(est.totalPorConcepto.PASAJE_IDA + est.totalPorConcepto.PASAJE_REGRESO);
      comidaEstimado = redondear(est.totalPorConcepto.DESAYUNO + est.totalPorConcepto.ALMUERZO);
    }
    const estimadoManual = sumar(
      (p?.categoriasVariablesMes || []).filter((c) => !idsTransporteComida.has(c.categoriaId)),
      "montoEstimado"
    );
    const gastosVariablesEstimado = redondear(transporteEstimado + comidaEstimado + estimadoManual);
    const gastosVariablesReal = redondear(sumarNeto(p?.transacciones || [], "monto") + sumar(p?.trackerDiario || [], "monto"));

    agregarMes(resultado.gastosVariables, mes, gastosVariablesEstimado, gastosVariablesReal);
  }

  return resultado;
}

module.exports = { calcularResumenAnualCompleto };
