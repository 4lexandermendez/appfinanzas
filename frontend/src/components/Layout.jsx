import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClase = ({ isActive }) =>
  `text-sm ${isActive ? "text-purple-700 font-medium" : "text-gray-500 hover:text-purple-700"}`;

export default function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="font-semibold text-gray-900">Finanzas Personales</span>
            <nav className="flex items-center gap-4 flex-wrap">
              <NavLink to="/" end className={linkClase}>
                Registro rápido
              </NavLink>
              <NavLink to="/anual" className={linkClase}>
                Anual
              </NavLink>
              <NavLink to="/mes" className={linkClase}>
                Mes
              </NavLink>
              <NavLink to="/presupuesto" className={linkClase}>
                Presupuesto
              </NavLink>
              <NavLink to="/tarjetas" className={linkClase}>
                Tarjetas
              </NavLink>
              <NavLink to="/ajustes" className={linkClase}>
                Ajustes
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{usuario?.nombre}</span>
            <button onClick={logout} className="text-purple-600 hover:underline">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Suspense fallback={<div className="p-6 text-center text-gray-500">Cargando...</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
