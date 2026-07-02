import client from "./client";

export async function listarDiasLibres(anio, mes) {
  const { data } = await client.get("/dias-libres", { params: { anio, mes } });
  return data.diasLibres;
}

export async function crearDiaLibre(datos) {
  const { data } = await client.post("/dias-libres", datos);
  return data.diaLibre;
}

export async function eliminarDiaLibre(id) {
  await client.delete(`/dias-libres/${id}`);
}
