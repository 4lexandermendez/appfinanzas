import client from "./client";

export async function obtenerAjustesTracker() {
  const { data } = await client.get("/ajustes-tracker");
  return data.ajuste;
}

export async function guardarAjustesTracker(datos) {
  const { data } = await client.put("/ajustes-tracker", datos);
  return data.ajuste;
}
