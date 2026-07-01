import client from "./client";

export async function registrarTracker({ fecha, concepto, monto }) {
  const { data } = await client.post("/tracker", { fecha, concepto, monto });
  return data.registro;
}
