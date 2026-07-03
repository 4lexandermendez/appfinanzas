import { Fragment, useEffect, useMemo, useState } from "react";
import { obtenerGastadoHoy } from "../api/dashboard";
import { listarBotonesRapidos } from "../api/botonesRapidos";
import { registrarTracker, listarTracker, eliminarTracker } from "../api/tracker";
import { listarCategorias, crearCategoria } from "../api/categorias";
import { crearTransaccion } from "../api/transacciones";
import AutocompletadoCategoria from "../components/AutocompletadoCategoria";

const CONCEPTOS = [
  { valor: "PASAJE_IDA", etiqueta: "Pasaje ida" },
  { valor: "DESAYUNO", etiqueta: "Desayuno" },
  { valor: "ALMUERZO", etiqueta: "Almuerzo" },
  { valor: "PASAJE_REGRESO", etiqueta: "Pasaje regreso" },
];

const NOMBRES_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diaDelMes(fechaISO) {
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDate();
}

function diaSemana(fechaISO) {
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDay();
}

function anioMes(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

function formatoFechaLarga(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  return d.toLocaleDateString("es", { day: "numeric", month: "long" });
}

export default function RegistroRapidoPage() {
  const hoyReal = useMemo(() => hoyISO(), []);
  const ventanaDias = useMemo(() => {
    const dias = [];
    for (let offset = -3; offset <= 3; offset++) dias.push(sumarDias(hoyReal, offset));
    return dias;
  }, [hoyReal]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyReal);
  const [gastadoDia, setGastadoDia] = useState(null);
  const [botones, setBotones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [registrosMes, setRegistrosMes] = useState([]);
  const [registrando, setRegistrando] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const [categoriaId, setCategoriaId] = useState(null);
  const [categoriaTexto, setCategoriaTexto] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [enviandoForm, setEnviandoForm] = useState(false);
  const [montosLibres, setMontosLibres] = useState({});

  async function cargarTodo() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const [totales, botonesData, categoriasData, trackerMes] = await Promise.all([
      obtenerGastadoHoy(fechaSeleccionada),
      listarBotonesRapidos(),
      listarCategorias(),
      listarTracker(anio, mes),
    ]);
    setGastadoDia(totales.totalHoy);
    setBotones(botonesData);
    setCategorias(categoriasData);
    setRegistrosMes(trackerMes);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada]);

  const diasConRegistro = useMemo(
    () => new Set(registrosMes.map((r) => r.fecha.slice(0, 10))),
    [registrosMes]
  );

  function registrosDelConcepto(concepto) {
    return registrosMes
      .filter((r) => r.fecha.slice(0, 10) === fechaSeleccionada && r.concepto === concepto)
      .sort((a, b) => a.id - b.id);
  }

  async function handleBoton(concepto, montoBoton) {
    setRegistrando(`${concepto}-${montoBoton}`);
    setMensaje("");
    try {
      await registrarTracker({ fecha: fechaSeleccionada, concepto, monto: montoBoton });
      await cargarTodo();
      setMensaje(`Registrado: $${montoBoton.toFixed(2)}`);
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

  async function handleMontoLibre(concepto) {
    const valor = montosLibres[concepto];
    if (valor === undefined || valor === "") return;
    await handleBoton(concepto, Number(valor));
    setMontosLibres((prev) => ({ ...prev, [concepto]: "" }));
  }

  async function handleSubmitGasto(e) {
    e.preventDefault();
    setMensaje("");
    setEnviandoForm(true);
    try {
      let idCategoria = categoriaId;
      if (!idCategoria && categoriaTexto.trim()) {
        const existente = categorias.find(
          (c) => c.nombre.toLowerCase() === categoriaTexto.trim().toLowerCase()
        );
        idCategoria = existente ? existente.id : (await crearCategoria(categoriaTexto.trim())).id;
      }
      if (!idCategoria) {
        setMensaje("Elige o escribe una categoría");
        return;
      }
      await crearTransaccion({ categoriaId: idCategoria, monto: Number(monto), fecha: fechaSeleccionada, notas: nota });
      setMonto("");
      setNota("");
      setCategoriaTexto("");
      setCategoriaId(null);
      const [totales, categoriasData] = await Promise.all([obtenerGastadoHoy(fechaSeleccionada), listarCategorias()]);
      setGastadoDia(totales.totalHoy);
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
        <p className="text-sm text-gray-500">
          {fechaSeleccionada === hoyReal ? "Hoy llevas gastado" : `Llevas gastado el ${formatoFechaLarga(fechaSeleccionada)}`}
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {gastadoDia === null ? "..." : `$${gastadoDia.toFixed(2)}`}
        </p>

        <div className="flex justify-center gap-1 mt-4 overflow-x-auto">
          {ventanaDias.map((f) => {
            const seleccionado = f === fechaSeleccionada;
            const esHoy = f === hoyReal;
            const dow = diaSemana(f);
            const finDeSemanaSinDatos = (dow === 0 || dow === 6) && !diasConRegistro.has(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFechaSeleccionada(f)}
                className={`flex flex-col items-center justify-center w-11 h-14 rounded-lg text-xs shrink-0 transition-colors ${
                  seleccionado
                    ? "bg-purple-600 text-white"
                    : finDeSemanaSinDatos
                      ? "bg-gray-50 text-gray-300"
                      : "bg-gray-100 text-gray-600 hover:bg-purple-100"
                } ${esHoy && !seleccionado ? "ring-1 ring-purple-400" : ""}`}
              >
                <span>{NOMBRES_DIA[dow]}</span>
                <span className="font-semibold text-sm">{diaDelMes(f)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {mensaje && (
        <p className="text-sm text-center text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-2">
          {mensaje}
        </p>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-x-4 mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Botones rápidos</h2>
          <h2 className="text-sm font-semibold text-gray-700">Hoy registraste</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {CONCEPTOS.map((c) => {
            const config = botones.find((b) => b.concepto === c.valor);
            const montos = config ? [config.monto1, config.monto2, config.monto3].filter(Boolean) : [];
            const registrosConcepto = registrosDelConcepto(c.valor);
            return (
              <Fragment key={c.valor}>
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-500 mb-1">{c.etiqueta}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={registrando === `${c.valor}-0`}
                      onClick={() => handleBoton(c.valor, 0)}
                      className="px-3 py-2 rounded bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      $0.00
                    </button>
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
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Otro"
                        value={montosLibres[c.valor] ?? ""}
                        onChange={(e) => setMontosLibres((prev) => ({ ...prev, [c.valor]: e.target.value }))}
                        className="w-16 border border-gray-300 rounded px-2 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleMontoLibre(c.valor)}
                        className="px-2 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-500 mb-1 invisible">{c.etiqueta}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {registrosConcepto.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1 py-1 text-xs text-gray-700"
                      >
                        ${Number(r.monto).toFixed(2)}
                        <button
                          type="button"
                          onClick={() => handleEliminarTracker(r.id)}
                          title="Corregir / borrar"
                          className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500"
                        >
                          🗑️
                        </button>
                      </span>
                    ))}
                    {registrosConcepto.length === 0 && (
                      <span className="text-xs text-gray-300">Sin registros</span>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmitGasto} className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Registrar un gasto</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <AutocompletadoCategoria
            categorias={categorias}
            valor={categoriaTexto}
            onChange={(texto, id) => {
              setCategoriaTexto(texto);
              setCategoriaId(id);
            }}
            placeholder="Ej. Netflix (empezá a escribir para ver sugerencias)"
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
          {enviandoForm ? "Registrando..." : `Registrar gasto (${fechaSeleccionada === hoyReal ? "hoy" : formatoFechaLarga(fechaSeleccionada)})`}
        </button>
      </form>
    </div>
  );
}
