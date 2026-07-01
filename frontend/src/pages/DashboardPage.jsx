import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { usuario } = useAuth();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-lg font-semibold text-gray-900">
        Bienvenido, {usuario?.nombre}
      </h1>
      <p className="text-gray-500 mt-1">
        Aquí va el dashboard del mes (próximo paso del plan).
      </p>
    </div>
  );
}
