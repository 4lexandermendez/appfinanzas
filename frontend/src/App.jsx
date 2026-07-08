import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistroPage from "./pages/RegistroPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";

// Cada pestaña se carga en su propio chunk (via Suspense en Layout.jsx) en
// vez de ir todas en el bundle inicial — Anual y Mes en particular meten
// Recharts, que es la libreria mas pesada del proyecto.
const RegistroRapidoPage = lazy(() => import("./pages/RegistroRapidoPage"));
const PresupuestoPage = lazy(() => import("./pages/PresupuestoPage"));
const TarjetasPage = lazy(() => import("./pages/TarjetasPage"));
const ResumenAnualPage = lazy(() => import("./pages/ResumenAnualPage"));
const AjustesPage = lazy(() => import("./pages/AjustesPage"));
const MesPage = lazy(() => import("./pages/MesPage"));

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RegistroRapidoPage />} />
        <Route path="presupuesto" element={<PresupuestoPage />} />
        <Route path="tarjetas" element={<TarjetasPage />} />
        <Route path="anual" element={<ResumenAnualPage />} />
        <Route path="ajustes" element={<AjustesPage />} />
        <Route path="mes" element={<MesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
