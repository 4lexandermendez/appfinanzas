import { useEffect, useState } from "react";
import {
  listarTarjetas, crearTarjeta, eliminarTarjeta,
  listarMovimientos, crearMovimiento, eliminarMovimiento,
} from "../api/tarjetas";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function NuevaTarjetaForm({ onSubmit }) {
  const [nombre, setNombre] = useState("");
  const [limite, setLimite] = useState("");
  const [diaCorte, setDiaCorte] = useState("");
  const [diaPago, setDiaPago] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !limite || !diaCorte || !diaPago) return;
    await onSubmit({ nombre: nombre.trim(), limite: Number(limite), diaCorte: Number(diaCorte), diaPago: Number(diaPago) });
    setNombre(""); setLimite(""); setDiaCorte(""); setDiaPago("");
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-2">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Agregar tarjeta</h2>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Nombre (ej. Visa BAC)" value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm col-span-2" />
        <input type="number" step="0.01" placeholder="Límite" value={limite}
          onChange={(e) => setLimite(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm" />
        <div />
        <input type="number" min="1" max="31" placeholder="Día de corte" value={diaCorte}
          onChange={(e) => setDiaCorte(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm" />
        <input type="number" min="1" max="31" placeholder="Día de pago" value={diaPago}
          onChange={(e) => setDiaPago(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Agregar tarjeta
      </button>
    </form>
  );
}

function MovimientoForm({ onSubmit }) {
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!monto) return;
    await onSubmit({ monto: Number(monto), fecha: hoyISO(), descripcion });
    setMonto(""); setDescripcion("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input type="number" step="0.01" placeholder="Monto (+compra / -pago)" value={monto}
        onChange={(e) => setMonto(e.target.value)}
        className="w-40 border border-gray-300 rounded px-2 py-1 text-sm" />
      <input type="text" placeholder="Descripción" value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
      <button type="submit" className="bg-purple-100 text-purple-800 rounded px-3 py-1 text-sm hover:bg-purple-200">
        Agregar
      </button>
    </form>
  );
}

function TarjetaCard({ tarjeta, onEliminar, onRefrescar }) {
  const [expandida, setExpandida] = useState(false);
  const [movimientos, setMovimientos] = useState([]);

  async function cargarMovimientos() {
    setMovimientos(await listarMovimientos(tarjeta.id));
  }

  useEffect(() => {
    if (expandida) cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida]);

  async function handleNuevoMovimiento(datos) {
    await crearMovimiento(tarjeta.id, datos);
    await cargarMovimientos();
    onRefrescar();
  }
  async function handleEliminarMovimiento(id) {
    await eliminarMovimiento(tarjeta.id, id);
    await cargarMovimientos();
    onRefrescar();
  }

  const { info } = tarjeta;
  const corteUrgente = info.diasParaCorte <= 3;
  const pagoUrgente = info.diasParaPago <= 3;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{tarjeta.nombre}</h3>
          <p className="text-sm text-gray-500">
            Saldo ${Number(tarjeta.saldoActual).toFixed(2)} de ${Number(tarjeta.limite).toFixed(2)} (disponible $
            {info.disponible.toFixed(2)})
          </p>
        </div>
        <button onClick={() => onEliminar(tarjeta.id)} className="text-red-500 text-sm hover:underline">
          Eliminar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div className={`rounded px-3 py-2 ${corteUrgente ? "bg-yellow-50 text-yellow-800" : "bg-gray-50 text-gray-600"}`}>
          Corta en {info.diasParaCorte} día{info.diasParaCorte === 1 ? "" : "s"}
        </div>
        <div className={`rounded px-3 py-2 ${pagoUrgente ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
          Pagar en {info.diasParaPago} día{info.diasParaPago === 1 ? "" : "s"}
        </div>
        <div className="rounded px-3 py-2 bg-gray-50 text-gray-600">
          Pago mínimo: ${info.pagoMinimo.toFixed(2)}
        </div>
        <div className="rounded px-3 py-2 bg-gray-50 text-gray-600">
          Diferencia con pago total: ${info.diferenciaPago.toFixed(2)}
        </div>
      </div>

      <button
        onClick={() => setExpandida((v) => !v)}
        className="text-purple-600 text-sm mt-3 hover:underline"
      >
        {expandida ? "Ocultar movimientos" : "Ver movimientos"}
      </button>

      {expandida && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="space-y-1">
            {movimientos.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-24">{m.fecha.slice(0, 10)}</span>
                <span className={`w-20 ${Number(m.monto) < 0 ? "text-green-600" : "text-gray-800"}`}>
                  ${Number(m.monto).toFixed(2)}
                </span>
                <span className="flex-1 text-gray-500">{m.descripcion}</span>
                <button onClick={() => handleEliminarMovimiento(m.id)} className="text-red-500 hover:underline">
                  Eliminar
                </button>
              </div>
            ))}
            {movimientos.length === 0 && <p className="text-sm text-gray-400">Sin movimientos</p>}
          </div>
          <MovimientoForm onSubmit={handleNuevoMovimiento} />
        </div>
      )}
    </div>
  );
}

export default function TarjetasPage() {
  const [tarjetas, setTarjetas] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setTarjetas(await listarTarjetas());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleNuevaTarjeta(datos) {
    await crearTarjeta(datos);
    cargar();
  }
  async function handleEliminarTarjeta(id) {
    await eliminarTarjeta(id);
    cargar();
  }

  if (cargando) {
    return <div className="p-6 text-center text-gray-500">Cargando tarjetas...</div>;
  }

  return (
    <div className="space-y-4">
      {tarjetas.map((t) => (
        <TarjetaCard key={t.id} tarjeta={t} onEliminar={handleEliminarTarjeta} onRefrescar={cargar} />
      ))}
      {tarjetas.length === 0 && (
        <p className="text-sm text-gray-400 text-center">Aún no tienes tarjetas registradas</p>
      )}
      <NuevaTarjetaForm onSubmit={handleNuevaTarjeta} />
    </div>
  );
}
