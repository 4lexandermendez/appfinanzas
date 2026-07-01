import client from "./client";

export async function crearTransaccion({ categoriaId, monto, fecha, notas }) {
  const { data } = await client.post("/transacciones", { categoriaId, monto, fecha, notas });
  return data.transaccion;
}
