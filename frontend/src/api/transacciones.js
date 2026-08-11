import client from "./client";

export async function crearTransaccion({ categoriaId, monto, fecha, notas, fuente, tarjetaId, cuenta, aportesExternos }) {
  const { data } = await client.post("/transacciones", {
    categoriaId, monto, fecha, notas, fuente, tarjetaId, cuenta, aportesExternos,
  });
  return data.transaccion;
}

export async function listarTransacciones(anio, mes) {
  const { data } = await client.get("/transacciones", { params: { anio, mes } });
  return data.transacciones;
}

export async function actualizarTransaccion(id, cambios) {
  const { data } = await client.put(`/transacciones/${id}`, cambios);
  return data.transaccion;
}

export async function eliminarTransaccion(id) {
  await client.delete(`/transacciones/${id}`);
}
