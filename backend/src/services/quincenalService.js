const { redondear } = require("../utils/dinero");
const { calcularEstimadoMes } = require("./estimadoTrackerService");
const { calcularResumenReal } = require("./resumenTrackerService");

function filaQuincenal(estimadoQuincenas, realQuincenas, campo) {
  const q1Estimado = estimadoQuincenas[0][campo];
  const q1Real = realQuincenas[0][campo];
  const q2Estimado = estimadoQuincenas[1][campo];
  const q2Real = realQuincenas[1][campo];

  return {
    quincena1: { estimado: q1Estimado, real: q1Real, ahorrado: redondear(q1Estimado - q1Real) },
    quincena2: { estimado: q2Estimado, real: q2Real, ahorrado: redondear(q2Estimado - q2Real) },
    total: {
      estimado: redondear(q1Estimado + q2Estimado),
      real: redondear(q1Real + q2Real),
      ahorrado: redondear(q1Estimado + q2Estimado - (q1Real + q2Real)),
    },
  };
}

async function calcularDetalleQuincenal(usuarioId, anio, mes) {
  const estimado = await calcularEstimadoMes(usuarioId, anio, mes);
  const real = await calcularResumenReal(usuarioId, anio, mes);

  if (!estimado) return null;

  return {
    transporte: filaQuincenal(estimado.quincenas, real.quincenas, "transporte"),
    comida: filaQuincenal(estimado.quincenas, real.quincenas, "comida"),
  };
}

module.exports = { calcularDetalleQuincenal };
