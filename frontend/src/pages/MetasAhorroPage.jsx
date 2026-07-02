import { useEffect, useState } from "react";
import { listarMetas, crearMeta, actualizarMeta, eliminarMeta } from "../api/metasAhorro";

function NuevaMetaForm({ onSubmit }) {
  const [nombre, setNombre] = useState("");
  const [montoObjetivo, setMontoObjetivo] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !montoObjetivo) return;
    await onSubmit({ nombre: nombre.trim(), montoObjetivo: Number(montoObjetivo), fechaLimite: fechaLimite || null });
    setNombre(""); setMontoObjetivo(""); setFechaLimite("");
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-2">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Nueva meta</h2>
      <input
        type="text"
        placeholder="Ej. Fondo de emergencia"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="Monto objetivo"
          value={montoObjetivo}
          onChange={(e) => setMontoObjetivo(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <input
          type="date"
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Crear meta
      </button>
    </form>
  );
}

function MetaCard({ meta, onActualizar, onEliminar }) {
  const objetivo = Number(meta.montoObjetivo);
  const actual = Number(meta.montoActual);
  const porcentaje = objetivo > 0 ? Math.min(100, Math.round((actual / objetivo) * 100)) : 0;

  async function handleAbono(e) {
    e.preventDefault();
    const monto = Number(e.target.elements.abono.value);
    if (!monto) return;
    await onActualizar(meta.id, { montoActual: actual + monto });
    e.target.reset();
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{meta.nombre}</h3>
          <p className="text-sm text-gray-500">
            ${actual.toFixed(2)} de ${objetivo.toFixed(2)}
            {meta.fechaLimite && ` · límite ${meta.fechaLimite.slice(0, 10)}`}
          </p>
        </div>
        <button onClick={() => onEliminar(meta.id)} className="text-red-500 text-sm hover:underline">
          Eliminar
        </button>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 mt-3">
        <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{porcentaje}%</p>
      <form onSubmit={handleAbono} className="flex gap-2 mt-3">
        <input
          name="abono"
          type="number"
          step="0.01"
          placeholder="Agregar abono"
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-purple-100 text-purple-800 rounded px-3 py-1 text-sm hover:bg-purple-200">
          Abonar
        </button>
      </form>
    </div>
  );
}

export default function MetasAhorroPage() {
  const [metas, setMetas] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setMetas(await listarMetas());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleNuevaMeta(datos) {
    await crearMeta(datos);
    cargar();
  }
  async function handleActualizar(id, cambios) {
    await actualizarMeta(id, cambios);
    cargar();
  }
  async function handleEliminar(id) {
    await eliminarMeta(id);
    cargar();
  }

  if (cargando) {
    return <div className="p-6 text-center text-gray-500">Cargando metas...</div>;
  }

  return (
    <div className="space-y-4">
      {metas.map((m) => (
        <MetaCard key={m.id} meta={m} onActualizar={handleActualizar} onEliminar={handleEliminar} />
      ))}
      {metas.length === 0 && <p className="text-sm text-gray-400 text-center">Aún no tienes metas de ahorro</p>}
      <NuevaMetaForm onSubmit={handleNuevaMeta} />
    </div>
  );
}
