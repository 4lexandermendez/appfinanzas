import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegistroPage() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await registrar({ nombre, email, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la cuenta");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-lg shadow space-y-4"
      >
        <h1 className="text-xl font-semibold text-gray-900">Crear cuenta</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Contraseña</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres</p>
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-purple-600 text-white rounded py-2 font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {enviando ? "Creando..." : "Crear cuenta"}
        </button>

        <p className="text-sm text-gray-600 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-purple-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
