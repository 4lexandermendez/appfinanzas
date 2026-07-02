import client from "./client";

export async function listarMetas() {
  const { data } = await client.get("/metas-ahorro");
  return data.metas;
}

export async function crearMeta(datos) {
  const { data } = await client.post("/metas-ahorro", datos);
  return data.meta;
}

export async function actualizarMeta(id, cambios) {
  const { data } = await client.put(`/metas-ahorro/${id}`, cambios);
  return data.meta;
}

export async function eliminarMeta(id) {
  await client.delete(`/metas-ahorro/${id}`);
}
