import client from "./client";

export async function listarNotas(anio, mes) {
  const { data } = await client.get("/presupuesto/notas", { params: { anio, mes } });
  return data.notas;
}

export async function guardarNota(anio, mes, orden, contenido) {
  const { data } = await client.put("/presupuesto/notas", { anio, mes, orden, contenido });
  return data.nota;
}

export async function crearNota(anio, mes) {
  const { data } = await client.post("/presupuesto/notas", { anio, mes });
  return data.nota;
}

export async function eliminarNota(id) {
  await client.delete(`/presupuesto/notas/${id}`);
}
