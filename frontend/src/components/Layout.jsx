import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Zap, Calendar, BarChart3, Wallet, CreditCard, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", end: true, label: "Registro rápido", Icon: Zap },
  { to: "/mes", label: "Mes", Icon: Calendar },
  { to: "/anual", label: "Anual", Icon: BarChart3 },
  { to: "/presupuesto", label: "Presupuesto", Icon: Wallet },
  { to: "/tarjetas", label: "Cuentas", Icon: CreditCard },
];

const TITULOS = {
  "/": "Registro rápido",
  "/mes": "Mes",
  "/anual": "Anual",
  "/presupuesto": "Presupuesto",
  "/tarjetas": "Cuentas",
  "/ajustes": "Ajustes",
};

function obtenerIniciales(nombre) {
  if (!nombre) return "";
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const itemClase = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"
  }`;

function SidebarContent({ usuario, onNavigate, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {obtenerIniciales(usuario?.nombre)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{usuario?.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{usuario?.email}</p>
        </div>
      </div>
      <div className="border-t border-gray-100" />

      <nav className="flex-1 px-3 py-3 space-y-1">
        {NAV_ITEMS.map(({ to, end, label, Icon }) => (
          <NavLink key={to} to={to} end={end} className={itemClase} onClick={onNavigate}>
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-3 py-3 space-y-1">
        <NavLink to="/ajustes" className={itemClase} onClick={onNavigate}>
          <Settings className="w-5 h-5 shrink-0" />
          Ajustes
        </NavLink>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);

  function cerrar() {
    setAbierto(false);
  }

  // Refuerzo para el zoom pegado de Safari en iPhone: a veces, aunque el
  // input ya tenga letra de 16px, Safari se queda con el zoom aplicado al
  // salir del campo. Este truco fuerza a Safari a re-evaluar el viewport
  // justo al salir de cualquier input/select/textarea, lo que lo hace
  // regresar al tamano normal. No tiene efecto visible en otros navegadores.
  useEffect(() => {
    function alSalirDeCampo(e) {
      const tag = e.target.tagName;
      if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") return;
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) return;
      const original = viewport.getAttribute("content");
      viewport.setAttribute("content", `${original}, maximum-scale=1.0`);
      setTimeout(() => viewport.setAttribute("content", original), 300);
    }
    document.addEventListener("focusout", alSalirDeCampo);
    return () => document.removeEventListener("focusout", alSalirDeCampo);
  }, []);

  const tituloActual = TITULOS[location.pathname] ?? "Finanzas Personales";

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-[260px] bg-white border-r border-gray-200">
        <SidebarContent usuario={usuario} onLogout={logout} />
      </aside>

      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          abierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={cerrar}
      />
      <aside
        className={`fixed inset-y-0 left-0 w-3/4 max-w-xs bg-white z-50 flex flex-col shadow-lg transition-transform duration-300 lg:hidden ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button onClick={cerrar} className="self-start m-3 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 min-h-0">
          <SidebarContent usuario={usuario} onNavigate={cerrar} onLogout={logout} />
        </div>
      </aside>

      <div className="lg:ml-[260px]">
        <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="relative flex items-center px-4 py-3">
            <button onClick={() => setAbierto(true)} className="text-gray-600 hover:text-gray-900">
              <Menu className="w-6 h-6" />
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-gray-900">
              {tituloActual}
            </span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Cargando...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
