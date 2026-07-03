import client from "./client";

export async function obtenerGastadoHoy(fecha) {
  const { data } = await client.get("/dashboard/hoy", { params: fecha ? { fecha } : {} });
  return data;
}

export async function obtenerResumenMes(anio, mes) {
  const { data } = await client.get("/dashboard/resumen-mes", { params: { anio, mes } });
  return data;
}

export async function obtenerResumenAnual(anio) {
  const { data } = await client.get("/dashboard/resumen-anual", { params: { anio } });
  return data;
}

export async function obtenerResumenAnualCompleto(anio) {
  const { data } = await client.get("/dashboard/resumen-anual-completo", { params: { anio } });
  return data;
}
