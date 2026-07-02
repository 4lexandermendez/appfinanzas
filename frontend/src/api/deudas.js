import client from "./client";

export async function listarDeudasConfig() {
  const { data } = await client.get("/deudas");
  return data.deudas;
}

export async function crearDeuda({ nombre, saldoActual }) {
  const { data } = await client.post("/deudas", { nombre, saldoActual });
  return data.deuda;
}

export async function actualizarDeuda(id, cambios) {
  const { data } = await client.put(`/deudas/${id}`, cambios);
  return data.deuda;
}

export async function eliminarDeuda(id) {
  await client.delete(`/deudas/${id}`);
}

export async function listarDeudasMensual(anio, mes) {
  const { data } = await client.get("/deudas/mensual", { params: { anio, mes } });
  return data.deudas;
}

export async function guardarDeudaMensual({ deudaConfigId, anio, mes, montoEstimado, montoReal }) {
  const { data } = await client.put("/deudas/mensual", { deudaConfigId, anio, mes, montoEstimado, montoReal });
  return data.registro;
}
