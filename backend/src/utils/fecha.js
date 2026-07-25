function formatDateKey(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function parseFechaSoloDia(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

function diasEnMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

// El Salvador no tiene horario de verano, siempre es UTC-6. El servidor
// corre en UTC (Railway), asi que "new Date()" solo no sirve para saber que
// dia es "hoy" para el usuario: de 6pm a medianoche hora local, la fecha en
// UTC ya adelanto al dia siguiente. Se resta el offset fijo para leer el
// dia/mes/anio como los veria alguien en El Salvador ahora mismo, y se
// devuelve como medianoche UTC de ese dia (mismo formato que el resto del
// codigo usa para representar "un dia", vease parseFechaSoloDia).
const OFFSET_EL_SALVADOR_MS = 6 * 60 * 60 * 1000;

function hoyElSalvador() {
  const local = new Date(Date.now() - OFFSET_EL_SALVADOR_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

module.exports = { formatDateKey, parseFechaSoloDia, diasEnMes, hoyElSalvador };
