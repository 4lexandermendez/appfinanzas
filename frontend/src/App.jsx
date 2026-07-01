import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistroPage from "./pages/RegistroPage";
import DashboardPage from "./pages/DashboardPage";
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
        <Route index element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;
