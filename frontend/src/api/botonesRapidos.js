import client from "./client";

export async function listarBotonesRapidos() {
  const { data } = await client.get("/botones-rapidos");
  return data.botones;
}

export async function guardarBotonRapido(config) {
  const { data } = await client.put("/botones-rapidos", config);
  return data.boton;
}
