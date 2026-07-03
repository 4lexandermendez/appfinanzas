import client from "./client";

export async function obtenerNotas(anio, mes) {
  const { data } = await client.get("/presupuesto/notas", { params: { anio, mes } });
  return data.notas;
}

export async function guardarNotas(anio, mes, notas) {
  const { data } = await client.put("/presupuesto/notas", { anio, mes, notas });
  return data.notas;
}
