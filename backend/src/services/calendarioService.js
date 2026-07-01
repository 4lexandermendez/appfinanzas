const { formatDateKey } = require("../utils/fecha");

// Determina si un sábado dado "toca" según el patrón alterno configurado
// en Ajustes, contando semanas completas desde patronSabadoInicio.
function sabadoQueToca(fecha, ajuste) {
  const inicio = new Date(ajuste.patronSabadoInicio);
  const diffDias = Math.round((fecha - inicio) / (1000 * 60 * 60 * 24));
  const diffSemanas = Math.floor(diffDias / 7);
  const parIncluyendoNegativos = ((diffSemanas % 2) + 2) % 2 === 0;
  return parIncluyendoNegativos ? ajuste.patronSabadoPrimerDiaVa : !ajuste.patronSabadoPrimerDiaVa;
}

// tipos: LABORAL | SABADO_TOCA | SABADO_NO_TOCA | DOMINGO | LIBRE
function tipoDeDia(fecha, ajuste, diasLibresSet) {
  if (diasLibresSet.has(formatDateKey(fecha))) return "LIBRE";

  const diaSemana = fecha.getUTCDay(); // 0 = domingo, 6 = sábado
  if (diaSemana === 0) return "DOMINGO";
  if (diaSemana === 6) return sabadoQueToca(fecha, ajuste) ? "SABADO_TOCA" : "SABADO_NO_TOCA";
  return "LABORAL";
}

function conceptosParaTipo(tipo, ajuste) {
  if (tipo === "LABORAL") {
    return [
      { concepto: "PASAJE_IDA", monto: Number(ajuste.montoPasajeIda) },
      { concepto: "DESAYUNO", monto: Number(ajuste.montoDesayuno) },
      { concepto: "ALMUERZO", monto: Number(ajuste.montoAlmuerzo) },
      { concepto: "PASAJE_REGRESO", monto: Number(ajuste.montoPasajeRegreso) },
    ];
  }
  if (tipo === "SABADO_TOCA") {
    return [
      { concepto: "PASAJE_IDA", monto: Number(ajuste.montoPasajeSabadoIda) },
      { concepto: "DESAYUNO", monto: Number(ajuste.montoDesayunoSabado) },
      { concepto: "PASAJE_REGRESO", monto: Number(ajuste.montoPasajeSabadoRegreso) },
    ];
  }
  return [];
}

module.exports = { sabadoQueToca, tipoDeDia, conceptosParaTipo };
