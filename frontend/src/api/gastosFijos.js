import client from "./client";

export async function listarGastosFijosConfig() {
  const { data } = await client.get("/gastos-fijos");
  return data.gastosFijos;
}

export async function crearGastoFijo({ nombre, montoEstimado }) {
  const { data } = await client.post("/gastos-fijos", { nombre, montoEstimado });
  return data.gastoFijo;
}

export async function actualizarGastoFijo(id, cambios) {
  const { data } = await client.put(`/gastos-fijos/${id}`, cambios);
  return data.gastoFijo;
}

export async function eliminarGastoFijo(id) {
  await client.delete(`/gastos-fijos/${id}`);
}

export async function listarGastosFijosMensual(anio, mes) {
  const { data } = await client.get("/gastos-fijos/mensual", { params: { anio, mes } });
  return data.gastosFijos;
}

export async function guardarGastoFijoMensual({ gastoFijoConfigId, anio, mes, montoReal }) {
  const { data } = await client.put("/gastos-fijos/mensual", { gastoFijoConfigId, anio, mes, montoReal });
  return data.registro;
}
