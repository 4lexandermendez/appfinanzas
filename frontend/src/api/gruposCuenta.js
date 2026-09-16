import client from "./client";

export async function listarGruposCuenta() {
  const { data } = await client.get("/grupos-cuenta");
  return data.grupos;
}

export async function crearGrupoCuenta(nombre) {
  const { data } = await client.post("/grupos-cuenta", { nombre });
  return data.grupo;
}

export async function actualizarGrupoCuenta(id, nombre) {
  const { data } = await client.put(`/grupos-cuenta/${id}`, { nombre });
  return data.grupo;
}

export async function eliminarGrupoCuenta(id) {
  await client.delete(`/grupos-cuenta/${id}`);
}

export async function moverGrupoCuenta(id, direccion) {
  await client.post(`/grupos-cuenta/${id}/mover`, { direccion });
}

export async function crearCuentaBancaria(grupoId, nombre) {
  const { data } = await client.post(`/grupos-cuenta/${grupoId}/cuentas`, { nombre });
  return data.cuenta;
}

export async function actualizarCuentaBancaria(id, nombre, esPrincipal) {
  const { data } = await client.put(`/grupos-cuenta/cuentas/${id}`, {
    nombre,
    ...(typeof esPrincipal === "boolean" ? { esPrincipal } : {}),
  });
  return data.cuenta;
}

export async function eliminarCuentaBancaria(id) {
  await client.delete(`/grupos-cuenta/cuentas/${id}`);
}

export async function crearCuentaEfectivo() {
  const { data } = await client.post("/grupos-cuenta/configurar-efectivo");
  return data.grupo;
}
