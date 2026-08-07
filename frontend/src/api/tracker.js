import client from "./client";

export async function registrarTracker({ fecha, concepto, monto }) {
  const { data } = await client.post("/tracker", { fecha, concepto, monto });
  return data.registro;
}

export async function listarTracker(anio, mes) {
  const { data } = await client.get("/tracker", { params: { anio, mes } });
  return data.registros;
}

export async function eliminarTracker(id) {
  await client.delete(`/tracker/${id}`);
}

export async function obtenerDetalleQuincenal(anio, mes) {
  const { data } = await client.get("/tracker/quincenal", { params: { anio, mes } });
  return data;
}

export async function obtenerEstimadoMes(anio, mes) {
  const { data } = await client.get("/tracker/estimado", { params: { anio, mes } });
  return data;
}
