import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistroPage from "./pages/RegistroPage";
import RegistroRapidoPage from "./pages/RegistroRapidoPage";
import DashboardMesPage from "./pages/DashboardMesPage";
import PresupuestoPage from "./pages/PresupuestoPage";
import TarjetasPage from "./pages/TarjetasPage";
import AlertasPage from "./pages/AlertasPage";
import ResumenAnualPage from "./pages/ResumenAnualPage";
import MetasAhorroPage from "./pages/MetasAhorroPage";
import AjustesPage from "./pages/AjustesPage";
import MesPage from "./pages/MesPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";

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
        <Route path="dashboard" element={<DashboardMesPage />} />
        <Route path="presupuesto" element={<PresupuestoPage />} />
        <Route path="tarjetas" element={<TarjetasPage />} />
        <Route path="alertas" element={<AlertasPage />} />
        <Route path="anual" element={<ResumenAnualPage />} />
        <Route path="metas" element={<MetasAhorroPage />} />
        <Route path="ajustes" element={<AjustesPage />} />
        <Route path="mes" element={<MesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
