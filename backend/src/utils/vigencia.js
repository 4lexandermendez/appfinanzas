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

// Igual que estaVigenteEnMes pero a nivel de dia en vez de mes: de una lista
// de versiones (ordenadas ascendente por creadoEn), devuelve la version que
// estaba vigente en una fecha puntual. Se usa para que un cambio de monto a
// mitad de mes solo afecte los dias futuros, sin recalcular los ya pasados.
function versionVigenteEnFecha(versionesAsc, fecha) {
  let elegida = null;
  for (const v of versionesAsc) {
    const c = new Date(v.creadoEn);
    const creadoEnDia = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()));
    if (creadoEnDia <= fecha) elegida = v;
    else break;
  }
  return elegida;
}

module.exports = { estaVigenteEnMes, versionVigenteEnFecha };
