import client from "./client";

export async function listarAhorros(anio, mes) {
  const { data } = await client.get("/ahorros", { params: { anio, mes } });
  return data.ahorros;
}

export async function crearAhorro(datos) {
  const { data } = await client.post("/ahorros", datos);
  return data.ahorro;
}

export async function actualizarAhorro(id, cambios) {
  const { data } = await client.put(`/ahorros/${id}`, cambios);
  return data.ahorro;
}

export async function eliminarAhorro(id) {
  await client.delete(`/ahorros/${id}`);
}
