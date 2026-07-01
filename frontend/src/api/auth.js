import client from "./client";

export async function registrar({ nombre, email, password }) {
  const { data } = await client.post("/auth/registro", { nombre, email, password });
  return data;
}

export async function login({ email, password }) {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
}

export async function obtenerPerfil() {
  const { data } = await client.get("/auth/me");
  return data;
}
