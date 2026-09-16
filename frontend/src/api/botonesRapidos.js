import client from "./client";

export async function listarBotonesRapidos() {
  const { data } = await client.get("/botones-rapidos");
  return data.montos;
}

export async function crearMontoRapido(concepto, monto) {
  const { data } = await client.post("/botones-rapidos", { concepto, monto });
  return data.monto;
}

export async function eliminarMontoRapido(id) {
  await client.delete(`/botones-rapidos/${id}`);
}
