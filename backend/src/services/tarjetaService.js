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

function formatDateKey(fecha) {
  return fecha.toISOString().slice(0, 10);
}

// El corte anterior es la ocurrencia de diaCorte un mes antes del corte
// actual (con el mismo ajuste de "ultimo dia del mes" si el mes no llega a
// ese numero de dia).
function corteAnteriorA(diaCorte, corteActual) {
  const anio = corteActual.getUTCFullYear();
  const mes = corteActual.getUTCMonth();
  const totalMesesPrevio = anio * 12 + mes - 1;
  const anioPrevio = Math.floor(totalMesesPrevio / 12);
  const mesPrevio = ((totalMesesPrevio % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anioPrevio, mesPrevio + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anioPrevio, mesPrevio, Math.min(diaCorte, ultimoDia)));
}

// Ciclo de facturacion de una tarjeta, encadenado con el que le sigue: el
// periodo en que se puede gastar (corteAnterior+1 .. corteActual), el dia
// de corte, el dia de pago asociado a ESE corte, y ademas el corte y pago
// del ciclo siguiente — porque apenas pasa el corte se abre un nuevo
// periodo de gasto (para la siguiente factura) mientras todavia esta
// abierta la ventana de pago del corte que acaba de pasar.
function calcularCicloTarjeta(tarjeta, referencia = hoySinHora()) {
  const corteActual = proximaFechaDelMes(tarjeta.diaCorte, referencia);
  const corteAnterior = corteAnteriorA(tarjeta.diaCorte, corteActual);
  const pagoActual = proximaFechaDelMes(tarjeta.diaPago, corteActual);

  const diaDespuesCorte = new Date(corteActual);
  diaDespuesCorte.setUTCDate(diaDespuesCorte.getUTCDate() + 1);
  const corteSiguiente = proximaFechaDelMes(tarjeta.diaCorte, diaDespuesCorte);
  const pagoSiguiente = proximaFechaDelMes(tarjeta.diaPago, corteSiguiente);

  const inicioCiclo = new Date(corteAnterior);
  inicioCiclo.setUTCDate(inicioCiclo.getUTCDate() + 1);

  return {
    inicioCiclo: formatDateKey(inicioCiclo),
    corteAnterior: formatDateKey(corteAnterior),
    corteActual: formatDateKey(corteActual),
    pagoActual: formatDateKey(pagoActual),
    corteSiguiente: formatDateKey(corteSiguiente),
    pagoSiguiente: formatDateKey(pagoSiguiente),
  };
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
    ciclo: calcularCicloTarjeta(tarjeta, hoy),
  };
}

module.exports = { calcularInfoTarjeta, calcularCicloTarjeta };
