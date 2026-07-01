import client from "./client";

export async function listarIngresos(anio, mes) {
  const { data } = await client.get("/ingresos", { params: { anio, mes } });
  return data.ingresos;
}

export async function crearIngreso(datos) {
  const { data } = await client.post("/ingresos", datos);
  return data.ingreso;
}

export async function actualizarIngreso(id, cambios) {
  const { data } = await client.put(`/ingresos/${id}`, cambios);
  return data.ingreso;
}

export async function eliminarIngreso(id) {
  await client.delete(`/ingresos/${id}`);
}
