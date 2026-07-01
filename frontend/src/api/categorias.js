import client from "./client";

export async function listarCategorias() {
  const { data } = await client.get("/categorias");
  return data.categorias;
}

export async function crearCategoria(nombre) {
  const { data } = await client.post("/categorias", { nombre });
  return data.categoria;
}
