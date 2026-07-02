// Calcula la próxima fecha (a partir de "desde", inclusive) en la que cae
// un día fijo del mes (ej. día de corte = 31). Si el mes no tiene ese día,
// usa el último día del mes (ej. 31 en febrero -> 28).
function proximaFechaDelMes(diaDelMes, desde) {
  function fechaEnMes(anio, mes) {
    const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    const dia = Math.min(diaDelMes, ultimoDia);
    return new Date(Date.UTC(anio, mes, dia));
  }

  const anio = desde.getUTCFullYear();
  const mes = desde.getUTCMonth();
  let candidata = fechaEnMes(anio, mes);
  if (candidata < desde) {
    const totalMeses = anio * 12 + mes + 1;
    candidata = fechaEnMes(Math.floor(totalMeses / 12), totalMeses % 12);
  }
  return candidata;
}

function diasEntre(fechaObjetivo, desde) {
  return Math.round((fechaObjetivo - desde) / (1000 * 60 * 60 * 24));
}

function hoySinHora() {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

function calcularInfoTarjeta(tarjeta) {
  const hoy = hoySinHora();
  const proximoCorte = proximaFechaDelMes(tarjeta.diaCorte, hoy);
  const proximoPago = proximaFechaDelMes(tarjeta.diaPago, hoy);

  const saldoActual = Number(tarjeta.saldoActual);
  const pagoMinimo = Math.round(saldoActual * (Number(tarjeta.porcentajePagoMinimo) / 100) * 100) / 100;
  const diferenciaPago = Math.round((saldoActual - pagoMinimo) * 100) / 100;

  return {
    diasParaCorte: diasEntre(proximoCorte, hoy),
    diasParaPago: diasEntre(proximoPago, hoy),
    pagoMinimo,
    pagoTotal: saldoActual,
    diferenciaPago,
    disponible: Math.round((Number(tarjeta.limite) - saldoActual) * 100) / 100,
  };
}

module.exports = { calcularInfoTarjeta };
