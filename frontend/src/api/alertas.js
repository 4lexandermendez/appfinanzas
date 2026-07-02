import client from "./client";

export async function listarAlertas(anio, mes) {
  const { data } = await client.get("/alertas", { params: { anio, mes } });
  return data.alertas;
}

export async function listarAlertasConfig() {
  const { data } = await client.get("/alertas/config");
  return data.alertasConfig;
}

export async function guardarAlertaConfig(datos) {
  const { data } = await client.put("/alertas/config", datos);
  return data.alertaConfig;
}
