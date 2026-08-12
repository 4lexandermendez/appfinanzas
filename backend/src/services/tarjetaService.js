const { hoyElSalvador } = require("../utils/fecha");

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

function fechaEnMesConDia(diaDelMes, anio, mes) {
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(diaDelMes, ultimoDia)));
}

// Ciclo de facturacion de una tarjeta, con los dos cortes relevantes:
//
// - corteVencido: el ultimo corte que ya paso (<= hoy) — es el que hay que
//   pagar, con vencimiento en pagoVencido.
// - corteProximo: el corte que viene — es la fecha limite del periodo en el
//   que se puede gastar AHORA (de corteVencido+1 en adelante), con su
//   propio pago en pagoProximo.
//
// Se separan los dos porque apenas pasa un corte se abre un nuevo periodo
// de gasto para la siguiente factura, mientras todavia esta pendiente de
// pago la que acaba de cerrar.
function calcularCicloTarjeta(tarjeta, referencia = hoyElSalvador()) {
  const corteEsteMes = fechaEnMesConDia(tarjeta.diaCorte, referencia.getUTCFullYear(), referencia.getUTCMonth());
  const corteVencido = corteEsteMes <= referencia ? corteEsteMes : corteAnteriorA(tarjeta.diaCorte, corteEsteMes);
  const corteAntesDelVencido = corteAnteriorA(tarjeta.diaCorte, corteVencido);

  const diaDespuesDelVencido = new Date(corteVencido);
  diaDespuesDelVencido.setUTCDate(diaDespuesDelVencido.getUTCDate() + 1);
  const corteProximo = proximaFechaDelMes(tarjeta.diaCorte, diaDespuesDelVencido);

  const pagoVencido = proximaFechaDelMes(tarjeta.diaPago, corteVencido);
  const pagoProximo = proximaFechaDelMes(tarjeta.diaPago, corteProximo);

  const inicioCicloVencido = new Date(corteAntesDelVencido);
  inicioCicloVencido.setUTCDate(inicioCicloVencido.getUTCDate() + 1);

  return {
    inicioCicloVencido: formatDateKey(inicioCicloVencido),
    corteVencido: formatDateKey(corteVencido),
    pagoVencido: formatDateKey(pagoVencido),
    corteProximo: formatDateKey(corteProximo),
    pagoProximo: formatDateKey(pagoProximo),
  };
}

function calcularInfoTarjeta(tarjeta) {
  const hoy = hoyElSalvador();
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

// Cuanto hay que pagar del ciclo YA CORTADO especificamente (no lo que se
// esta acumulando en el ciclo nuevo, todavia abierto) — solo cuenta lo
// cargado hasta corteVencido y que no se haya pagado ya (id posterior al
// ultimo pago). Es la misma cuenta que usa el aviso de Registro Rapido, y
// tambien la que debe pagar el boton "Pagar saldo total" de Cuentas: pagar
// de mas ahi estaria adelantando algo que ni siquiera vence todavia.
function calcularMontoCicloVencido(movimientos, ciclo) {
  const idUltimoPago = movimientos
    .filter((m) => Number(m.monto) < 0)
    .reduce((max, m) => Math.max(max, m.id), 0);
  const monto = movimientos
    .filter((m) => m.id > idUltimoPago && formatDateKey(m.fecha) <= ciclo.corteVencido)
    .reduce((s, m) => s + Number(m.monto), 0);
  return Math.round((monto + Number.EPSILON) * 100) / 100;
}

module.exports = { calcularInfoTarjeta, calcularCicloTarjeta, calcularMontoCicloVencido };
