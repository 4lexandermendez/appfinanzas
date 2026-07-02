import { useEffect, useState } from "react";
import { obtenerGastadoHoy } from "../api/dashboard";
import { listarBotonesRapidos } from "../api/botonesRapidos";
import { registrarTracker, listarTracker, eliminarTracker } from "../api/tracker";
import { listarCategorias, crearCategoria } from "../api/categorias";
import { crearTransaccion } from "../api/transacciones";

const CONCEPTOS = [
  { valor: "PASAJE_IDA", etiqueta: "Pasaje ida" },
  { valor: "DESAYUNO", etiqueta: "Desayuno" },
  { valor: "ALMUERZO", etiqueta: "Almuerzo" },
  { valor: "PASAJE_REGRESO", etiqueta: "Pasaje regreso" },
];

const ETIQUETAS_CONCEPTO = Object.fromEntries(CONCEPTOS.map((c) => [c.valor, c.etiqueta]));

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RegistroRapidoPage() {
  const [gastadoHoy, setGastadoHoy] = useState(null);
  const [botones, setBotones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [registrosHoy, setRegistrosHoy] = useState([]);
  const [registrando, setRegistrando] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const [categoriaId, setCategoriaId] = useState("");
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [enviandoForm, setEnviandoForm] = useState(false);

  async function cargarTodo() {
    const hoy = new Date();
    const [totales, botonesData, categoriasData, trackerMes] = await Promise.all([
      obtenerGastadoHoy(),
      listarBotonesRapidos(),
      listarCategorias(),
      listarTracker(hoy.getFullYear(), hoy.getMonth() + 1),
    ]);
    setGastadoHoy(totales.totalHoy);
    setBotones(botonesData);
    setCategorias(categoriasData);
    setRegistrosHoy(trackerMes.filter((r) => r.fecha.slice(0, 10) === hoyISO()));
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  async function handleBoton(concepto, montoBoton) {
    setRegistrando(`${concepto}-${montoBoton}`);
    setMensaje("");
    try {
      await registrarTracker({ fecha: hoyISO(), concepto, monto: montoBoton });
      await cargarTodo();
      setMensaje(`Registrado: $${montoBoton}`);
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar");
    } finally {
      setRegistrando(null);
    }
  }

  async function handleEliminarTracker(id) {
    await eliminarTracker(id);
    await cargarTodo();
  }

  async function handleSubmitGasto(e) {
    e.preventDefault();
    setMensaje("");
    setEnviandoForm(true);
    try {
      let idCategoria = categoriaId;
      if (!idCategoria && categoriaNueva.trim()) {
        const nueva = await crearCategoria(categoriaNueva.trim());
        idCategoria = nueva.id;
      }
      if (!idCategoria) {
        setMensaje("Elige o escribe una categoría");
        return;
      }
      await crearTransaccion({ categoriaId: idCategoria, monto: Number(monto), fecha: hoyISO(), notas: nota });
      setMonto("");
      setNota("");
      setCategoriaNueva("");
      setCategoriaId("");
      const [totales, categoriasData] = await Promise.all([obtenerGastadoHoy(), listarCategorias()]);
      setGastadoHoy(totales.totalHoy);
      setCategorias(categoriasData);
      setMensaje("Gasto registrado");
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar el gasto");
    } finally {
      setEnviandoForm(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-sm text-gray-500">Hoy llevas gastado</p>
        <p className="text-3xl font-bold text-gray-900">
          {gastadoHoy === null ? "..." : `$${gastadoHoy.toFixed(2)}`}
        </p>
      </div>

      {mensaje && (
        <p className="text-sm text-center text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-2">
          {mensaje}
        </p>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Botones rápidos</h2>
        <div className="space-y-3">
          {CONCEPTOS.map((c) => {
            const config = botones.find((b) => b.concepto === c.valor);
            const montos = config ? [config.monto1, config.monto2, config.monto3].filter(Boolean) : [];
            return (
              <div key={c.valor}>
                <p className="text-xs text-gray-500 mb-1">{c.etiqueta}</p>
                <div className="flex flex-wrap gap-2">
                  {montos.length === 0 && (
                    <span className="text-xs text-gray-400">
                      Sin montos configurados (ve a Ajustes)
                    </span>
                  )}
                  {montos.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={registrando === `${c.valor}-${m}`}
                      onClick={() => handleBoton(c.valor, Number(m))}
                      className="px-3 py-2 rounded bg-purple-100 text-purple-800 text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                    >
                      ${Number(m).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Hoy registraste</h2>
        <div className="space-y-1">
          {registrosHoy.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-gray-700">{ETIQUETAS_CONCEPTO[r.concepto] || r.concepto}</span>
              <span className="text-gray-500">${Number(r.monto).toFixed(2)}</span>
              <button
                onClick={() => handleEliminarTracker(r.id)}
                className="text-red-500 hover:underline"
              >
                Corregir / borrar
              </button>
            </div>
          ))}
          {registrosHoy.length === 0 && (
            <p className="text-sm text-gray-400">Todavía no registraste nada hoy en el tracker</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmitGasto} className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Registrar un gasto</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value);
              setCategoriaNueva("");
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">-- Elegir categoría existente --</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="...o escribe una categoría nueva"
            value={categoriaNueva}
            onChange={(e) => {
              setCategoriaNueva(e.target.value);
              setCategoriaId("");
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Nota (opcional)</label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={enviandoForm}
          className="w-full bg-purple-600 text-white rounded py-2 font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {enviandoForm ? "Registrando..." : "Registrar gasto"}
        </button>
      </form>
    </div>
  );
}
