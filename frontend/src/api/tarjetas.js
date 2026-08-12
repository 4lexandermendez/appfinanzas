import client from "./client";

export async function listarTarjetas() {
  const { data } = await client.get("/tarjetas");
  return data.tarjetas;
}

export async function crearTarjeta(datos) {
  const { data } = await client.post("/tarjetas", datos);
  return data.tarjeta;
}

export async function actualizarTarjeta(id, cambios) {
  const { data } = await client.put(`/tarjetas/${id}`, cambios);
  return data.tarjeta;
}

export async function eliminarTarjeta(id) {
  await client.delete(`/tarjetas/${id}`);
}

export async function pagarTarjeta(id) {
  const { data } = await client.post(`/tarjetas/${id}/pagar`);
  return data.tarjeta;
}

export async function obtenerResumenPago() {
  const { data } = await client.get("/tarjetas/resumen-pago");
  return data.pendientes;
}

export async function listarMovimientos(tarjetaId) {
  const { data } = await client.get(`/tarjetas/${tarjetaId}/movimientos`);
  return data.movimientos;
}

export async function crearMovimiento(tarjetaId, datos) {
  const { data } = await client.post(`/tarjetas/${tarjetaId}/movimientos`, datos);
  return data.movimiento;
}

export async function actualizarMovimiento(tarjetaId, id, revisado) {
  const { data } = await client.patch(`/tarjetas/${tarjetaId}/movimientos/${id}`, { revisado });
  return data.movimiento;
}

export async function eliminarMovimiento(tarjetaId, id) {
  await client.delete(`/tarjetas/${tarjetaId}/movimientos/${id}`);
}
