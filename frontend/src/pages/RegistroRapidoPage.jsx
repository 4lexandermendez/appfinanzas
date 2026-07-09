import { Fragment, useEffect, useMemo, useState } from "react";
import { obtenerGastadoHoy } from "../api/dashboard";
import { listarBotonesRapidos } from "../api/botonesRapidos";
import { registrarTracker, listarTracker, eliminarTracker } from "../api/tracker";
import { listarCategorias, crearCategoria } from "../api/categorias";
import { crearTransaccion } from "../api/transacciones";
import { listarGastosFijosMensual, guardarGastoFijoMensual } from "../api/gastosFijos";
import { listarTarjetas } from "../api/tarjetas";

const NUEVA_CATEGORIA = "__nueva__";

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
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [enviandoForm, setEnviandoForm] = useState(false);
  const [montosLibres, setMontosLibres] = useState({});
  const [tarjetas, setTarjetas] = useState([]);
  const [fuentePago, setFuentePago] = useState("EFECTIVO");
  const [tarjetaId, setTarjetaId] = useState("");

  const [gastosFijos, setGastosFijos] = useState([]);
  const [gastoFijoId, setGastoFijoId] = useState("");
  const [montoFijo, setMontoFijo] = useState("");
  const [enviandoFijo, setEnviandoFijo] = useState(false);

  async function cargarTodo() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const [totales, botonesData, categoriasData, trackerMes, gastosFijosData, tarjetasData] = await Promise.all([
      obtenerGastadoHoy(fechaSeleccionada),
      listarBotonesRapidos(),
      listarCategorias(),
      listarTracker(anio, mes),
      listarGastosFijosMensual(anio, mes),
      listarTarjetas(),
    ]);
    setGastadoDia(totales.totalHoy);
    setBotones(botonesData);
    setCategorias(categoriasData);
    setRegistrosMes(trackerMes);
    setGastosFijos(gastosFijosData.gastosFijos);
    setTarjetas(tarjetasData);
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
    const esNueva = categoriaId === NUEVA_CATEGORIA;
    if (!categoriaId || (esNueva && !nuevaCategoriaNombre.trim())) {
      setMensaje(esNueva ? "Escribí el nombre de la categoría nueva" : "Elige una categoría");
      return;
    }
    if (fuentePago === "TARJETA" && !tarjetaId) {
      setMensaje("Elige con qué tarjeta pagaste");
      return;
    }
    setEnviandoForm(true);
    try {
      const idFinal = esNueva ? (await crearCategoria(nuevaCategoriaNombre.trim())).id : Number(categoriaId);
      await crearTransaccion({
        categoriaId: idFinal,
        monto: Number(monto),
        fecha: fechaSeleccionada,
        fuente: fuentePago,
        tarjetaId: fuentePago === "TARJETA" ? Number(tarjetaId) : undefined,
      });
      setMonto("");
      setCategoriaId("");
      setNuevaCategoriaNombre("");
      setFuentePago("EFECTIVO");
      setTarjetaId("");
      await cargarTodo();
      const totales = await obtenerGastadoHoy(fechaSeleccionada);
      setGastadoDia(totales.totalHoy);
      setMensaje("Gasto registrado");
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar el gasto");
    } finally {
      setEnviandoForm(false);
    }
  }

  async function handleSubmitGastoFijo(e) {
    e.preventDefault();
    setMensaje("");
    if (!gastoFijoId || !montoFijo) {
      setMensaje("Elige un gasto fijo y su monto");
      return;
    }
    setEnviandoFijo(true);
    try {
      const { anio, mes } = anioMes(fechaSeleccionada);
      await guardarGastoFijoMensual({
        gastoFijoConfigId: Number(gastoFijoId),
        anio,
        mes,
        montoReal: Number(montoFijo),
      });
      setGastoFijoId("");
      setMontoFijo("");
      setMensaje("Gasto fijo marcado como pagado");
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar el gasto fijo");
    } finally {
      setEnviandoFijo(false);
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
                  {registrosConcepto.length === 0 ? (
                    <div className="inline-flex items-center px-3 py-2 rounded border border-dashed border-gray-200 text-xs text-gray-300">
                      Sin registros
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {registrosConcepto.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-2">
                          <span className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">
                            ${Number(r.monto).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEliminarTracker(r.id)}
                            title="Corregir / borrar"
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500"
                          >
                            🗑️
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmitGasto} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Gasto variable</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">¿Cuál pagaste?</label>
            <select
              value={categoriaId ?? ""}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Elegir categoría --</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
              <option value={NUEVA_CATEGORIA}>+ Imprevisto (categoría nueva)</option>
            </select>
            {categoriaId === NUEVA_CATEGORIA && (
              <input
                type="text"
                placeholder="Nombre de la categoría (ej. Emergencia carro)"
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              />
            )}
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
            <label className="block text-xs text-gray-500 mb-1">Pagaste con</label>
            <select
              value={fuentePago}
              onChange={(e) => setFuentePago(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta de crédito</option>
            </select>
            {fuentePago === "TARJETA" && (
              <select
                value={tarjetaId}
                onChange={(e) => setTarjetaId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              >
                <option value="">-- Elegir tarjeta --</option>
                {tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={enviandoForm}
            className="w-full bg-purple-600 text-white rounded py-2 font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {enviandoForm ? "Registrando..." : "Marcar como pagado"}
          </button>
        </form>

        <form onSubmit={handleSubmitGastoFijo} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Gasto fijo (ya pagado)</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">¿Cuál pagaste?</label>
            <select
              value={gastoFijoId}
              onChange={(e) => setGastoFijoId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Elegir gasto fijo --</option>
              {gastosFijos.map((g) => (
                <option key={g.gastoFijoConfigId} value={g.gastoFijoConfigId}>
                  {g.nombre} (est. ${Number(g.montoEstimado).toFixed(2)})
                </option>
              ))}
            </select>
            {gastosFijos.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No hay gastos fijos vigentes este mes. Agregalos en Presupuesto.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Monto pagado</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoFijo}
              onChange={(e) => setMontoFijo(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoFijo}
            className="w-full bg-pink-600 text-white rounded py-2 font-medium hover:bg-pink-700 disabled:opacity-50"
          >
            {enviandoFijo ? "Registrando..." : "Marcar como pagado"}
          </button>
        </form>
      </div>
    </div>
  );
}
