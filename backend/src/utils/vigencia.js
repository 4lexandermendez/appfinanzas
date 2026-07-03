// Un GastoFijoConfig cuenta para un mes solo si ya existía para entonces
// (creadoEn antes o durante el mes) y, si fue deshabilitado, solo si eso
// pasó después de que el mes ya había empezado. Así un gasto agregado en
// julio no aparece en enero, y uno cancelado en agosto sigue contando en
// los meses anteriores donde sí estuvo vigente.
function estaVigenteEnMes(item, anio, mes) {
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 1));

  if (item.creadoEn >= finMes) return false;
  if (item.desactivadoEn && item.desactivadoEn <= inicioMes) return false;
  return true;
}

module.exports = { estaVigenteEnMes };
