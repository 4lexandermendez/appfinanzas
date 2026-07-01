import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCargando(false);
      return;
    }
    authApi
      .obtenerPerfil()
      .then((data) => setUsuario(data.usuario))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setCargando(false));
  }, []);

  async function login(credenciales) {
    const data = await authApi.login(credenciales);
    localStorage.setItem("token", data.token);
    setUsuario(data.usuario);
  }

  async function registrar(datos) {
    const data = await authApi.registrar(datos);
    localStorage.setItem("token", data.token);
    setUsuario(data.usuario);
  }

  function logout() {
    localStorage.removeItem("token");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
