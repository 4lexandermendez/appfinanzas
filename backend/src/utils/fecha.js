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

module.exports = { formatDateKey, parseFechaSoloDia, diasEnMes };
