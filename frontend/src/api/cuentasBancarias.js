import client from "./client";

export async function crearTarjetaDebito(cuentaId, nombre) {
  const { data } = await client.post(`/grupos-cuenta/cuentas/${cuentaId}/tarjeta-debito`, { nombre });
  return data.tarjeta;
}

export async function eliminarTarjetaDebito(cuentaId) {
  await client.delete(`/grupos-cuenta/cuentas/${cuentaId}/tarjeta-debito`);
}

export async function listarMovimientosCuenta(cuentaId) {
  const { data } = await client.get(`/grupos-cuenta/cuentas/${cuentaId}/movimientos`);
  return data.movimientos;
}

export async function crearMovimientoCuenta(cuentaId, datos) {
  const { data } = await client.post(`/grupos-cuenta/cuentas/${cuentaId}/movimientos`, datos);
  return data.movimiento;
}

export async function eliminarMovimientoCuenta(cuentaId, id) {
  await client.delete(`/grupos-cuenta/cuentas/${cuentaId}/movimientos/${id}`);
}

export async function transferirEntreCuentas(cuentaId, datos) {
  const { data } = await client.post(`/grupos-cuenta/cuentas/${cuentaId}/transferencias`, datos);
  return data;
}
