import { useEffect, useState } from "react";
import {
  listarTarjetas, crearTarjeta, eliminarTarjeta,
  listarMovimientos, crearMovimiento, eliminarMovimiento,
} from "../api/tarjetas";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

const DIAS_SEMANA_DOM = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function construirSemanasCiclo(inicioISO, finISO) {
  const dias = [];
  let cursor = new Date(`${inicioISO}T00:00:00Z`);
  const fin = new Date(`${finISO}T00:00:00Z`);
  while (cursor <= fin) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86400000);
  }

  const semanas = [];
  let semana = Array(7).fill(null);
  let col = new Date(`${dias[0]}T00:00:00Z`).getUTCDay();
  for (const d of dias) {
    semana[col] = d;
    col++;
    if (col === 7) {
      semanas.push(semana);
      semana = Array(7).fill(null);
      col = 0;
    }
  }
  if (semana.some((x) => x !== null)) semanas.push(semana);
  return semanas;
}

// Calendario del ciclo de facturación: del día siguiente al corte anterior
// hasta el corte actual se puede seguir gastando (se va a cobrar en este
// ciclo); del corte actual hasta el día de pago es la ventana para pagar.
function CalendarioCiclo({ ciclo, movimientos }) {
  const semanas = construirSemanasCiclo(ciclo.inicioCiclo, ciclo.pagoActual);

  const totalPorDia = new Map();
  for (const m of movimientos) {
    const fecha = m.fecha.slice(0, 10);
    totalPorDia.set(fecha, (totalPorDia.get(fecha) || 0) + Number(m.monto));
  }

  function estiloDia(fecha) {
    if (fecha === ciclo.corteActual) return "bg-orange-100 border border-orange-400";
    if (fecha === ciclo.pagoActual) return "bg-blue-100 border border-blue-400";
    if (fecha <= ciclo.corteActual) return "bg-white";
    return "bg-blue-50/50";
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center gap-4 text-xs mb-2">
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-white border border-gray-300" /> Podés gastar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-orange-100 border border-orange-400" /> Corte</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-blue-50 border border-blue-200" /> Ventana de pago</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-blue-100 border border-blue-400" /> Pago</span>
      </div>
      <table className="w-full text-xs text-center border-collapse">
        <thead className="text-gray-400">
          <tr>
            {DIAS_SEMANA_DOM.map((d) => (
              <th key={d} className="px-1 py-1 font-medium">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i}>
              {semana.map((fecha, col) => {
                if (!fecha) return <td key={col} className="px-1 py-1" />;
                const dia = Number(fecha.slice(8, 10));
                const esInicioMes = dia === 1;
                const total = totalPorDia.get(fecha);
                return (
                  <td key={col} className={`px-1 py-1 align-top rounded ${estiloDia(fecha)}`}>
                    <div className="text-gray-600">
                      {dia}
                      {esInicioMes && <span className="text-gray-400"> {MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}</span>}
                    </div>
                    {fecha === ciclo.corteActual && <div className="text-[10px] text-orange-600 font-medium">Corte</div>}
                    {fecha === ciclo.pagoActual && <div className="text-[10px] text-blue-600 font-medium">Pago</div>}
                    {total ? (
                      <div className={`text-[10px] mt-0.5 ${total < 0 ? "text-green-600" : "text-gray-700"}`}>
                        ${Math.abs(total).toFixed(2)}
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [movimientos, setMovimientos] = useState([]);

  async function cargarMovimientos() {
    setMovimientos(await listarMovimientos(tarjeta.id));
  }

  useEffect(() => {
    if (expandida || mostrarCalendario) cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida, mostrarCalendario]);

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

      <div className="flex gap-4 mt-3">
        <button
          onClick={() => setExpandida((v) => !v)}
          className="text-purple-600 text-sm hover:underline"
        >
          {expandida ? "Ocultar movimientos" : "Ver movimientos"}
        </button>
        <button
          onClick={() => setMostrarCalendario((v) => !v)}
          className="text-purple-600 text-sm hover:underline"
        >
          {mostrarCalendario ? "Ocultar calendario" : "Ver calendario del ciclo"}
        </button>
      </div>

      {mostrarCalendario && <CalendarioCiclo ciclo={info.ciclo} movimientos={movimientos} />}

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
