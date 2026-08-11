import client from "./client";

export async function listarEstimadoVariables(anio, mes) {
  const { data } = await client.get("/categorias-variables-mensual", { params: { anio, mes } });
  return data.categorias;
}

export async function guardarEstimadoVariable({ categoriaId, anio, mes, montoEstimado }) {
  const { data } = await client.put("/categorias-variables-mensual", { categoriaId, anio, mes, montoEstimado });
  return data.registro;
}

export async function quitarEstimadoVariable(categoriaId, anio, mes) {
  await client.delete(`/categorias-variables-mensual/${categoriaId}`, { params: { anio, mes } });
}
