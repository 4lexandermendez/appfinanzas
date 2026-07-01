import client from "./client";

export async function obtenerGastadoHoy() {
  const { data } = await client.get("/dashboard/hoy");
  return data;
}
