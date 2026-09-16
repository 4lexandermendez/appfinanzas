import { useEffect, useState } from "react";
import { obtenerAjustesTracker, guardarAjustesTracker } from "../api/ajustesTracker";
import { listarBotonesRapidos, crearMontoRapido, eliminarMontoRapido } from "../api/botonesRapidos";
import { listarDiasLibres, crearDiaLibre, eliminarDiaLibre } from "../api/diasLibres";
import { listarAlertas, listarAlertasConfig, guardarAlertaConfig } from "../api/alertas";
import { hoyISO, hoyAnioMes } from "../utils/fecha";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ETIQUETAS_ALERTA = {
  PRESUPUESTO_CATEGORIA: { nombre: "Presupuesto por categoría", sufijo: "%" },
  LIMITE_VARIABLES: { nombre: "Límite en gastos variables", sufijo: "%" },
  TARJETA_CORTE: { nombre: "Aviso de corte de tarjeta", sufijo: "días antes" },
  TARJETA_PAGO: { nombre: "Aviso de pago de tarjeta", sufijo: "días antes" },
  RESUMEN_GENERAL: { nombre: "Resumen general del mes", sufijo: null },
};

const ESTILO_NIVEL = {
  rojo: "bg-red-50 border-red-200 text-red-700",
  amarillo: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

const CONCEPTOS_TRACKER = [
  { valor: "PASAJE_IDA", etiqueta: "Pasaje ida" },
  { valor: "DESAYUNO", etiqueta: "Desayuno" },
  { valor: "ALMUERZO", etiqueta: "Almuerzo" },
  { valor: "PASAJE_REGRESO", etiqueta: "Pasaje regreso" },
];

const MOTIVOS = ["VACACION", "ASUETO", "DESCANSO", "OTRO"];

const CAMPOS_SEMANA = [
  { campo: "montoPasajeIda", etiqueta: "Pasaje ida (entre semana)" },
  { campo: "montoDesayuno", etiqueta: "Desayuno (entre semana)" },
  { campo: "montoAlmuerzo", etiqueta: "Almuerzo (entre semana)" },
  { campo: "montoPasajeRegreso", etiqueta: "Pasaje regreso (entre semana)" },
];

const CAMPOS_SABADO = [
  { campo: "montoPasajeSabadoIda", etiqueta: "Pasaje ida (sábado)" },
  { campo: "montoDesayunoSabado", etiqueta: "Desayuno (sábado)" },
  { campo: "montoPasajeSabadoRegreso", etiqueta: "Pasaje regreso (sábado)" },
];

function SeccionAjustesTracker() {
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    obtenerAjustesTracker().then((ajuste) => {
      setForm(
        ajuste || {
          montoPasajeIda: "", montoDesayuno: "", montoAlmuerzo: "", montoPasajeRegreso: "",
          montoPasajeSabadoIda: "", montoDesayunoSabado: "", montoPasajeSabadoRegreso: "",
          patronSabadoInicio: "", patronSabadoPrimerDiaVa: true,
        }
      );
      setCargando(false);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje("");
    try {
      const guardado = await guardarAjustesTracker({
        ...form,
        patronSabadoInicio: form.patronSabadoInicio?.slice(0, 10),
      });
      setForm(guardado);
      setMensaje("Guardado");
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo guardar");
    }
  }

  if (cargando || !form) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-400">
        Estimado automático del Tracker de Transporte y Comida (Lunes a Viernes vs Sábado).
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {CAMPOS_SEMANA.map((c) => (
            <div key={c.campo}>
              <label className="block text-xs text-gray-500 mb-1">{c.etiqueta}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form[c.campo] ?? ""}
                onChange={(e) => setForm({ ...form, [c.campo]: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {CAMPOS_SABADO.map((c) => (
            <div key={c.campo}>
              <label className="block text-xs text-gray-500 mb-1">{c.etiqueta}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form[c.campo] ?? ""}
                onChange={(e) => setForm({ ...form, [c.campo]: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-2">Patrón de sábados alternos</p>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={form.patronSabadoInicio?.slice(0, 10) ?? ""}
              onChange={(e) => setForm({ ...form, patronSabadoInicio: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={form.patronSabadoPrimerDiaVa}
                onChange={(e) => setForm({ ...form, patronSabadoPrimerDiaVa: e.target.checked })}
                className="accent-purple-600"
              />
              Ese sábado sí voy
            </label>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Días libres</p>
          <SeccionDiasLibres />
        </div>
      </div>

      {mensaje && <p className="text-sm text-purple-700">{mensaje}</p>}
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Guardar ajustes
      </button>
    </form>
  );
}

function SeccionBotonesRapidos() {
  const [montos, setMontos] = useState([]);
  const [nuevoMonto, setNuevoMonto] = useState({});
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setMontos(await listarBotonesRapidos());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleAgregar(concepto) {
    const valor = nuevoMonto[concepto];
    if (!valor) return;
    await crearMontoRapido(concepto, Number(valor));
    setNuevoMonto({ ...nuevoMonto, [concepto]: "" });
    cargar();
  }

  async function handleEliminar(id) {
    await eliminarMontoRapido(id);
    cargar();
  }

  if (cargando) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Montos frecuentes por concepto para el carrusel de Registro Rápido — agregá los que quieras, sin límite.
      </p>
      {CONCEPTOS_TRACKER.map((c) => {
        const montosConcepto = montos.filter((m) => m.concepto === c.valor);
        return (
          <div key={c.valor} className="text-sm space-y-2 pb-2 border-b border-gray-100 last:border-0">
            <span className="block font-medium text-gray-700">{c.etiqueta}</span>
            {montosConcepto.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {montosConcepto.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 rounded-full pl-3 pr-1 py-1"
                  >
                    ${Number(m.monto).toFixed(2)}
                    <button
                      onClick={() => handleEliminar(m.id)}
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-purple-200"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Nuevo monto"
                value={nuevoMonto[c.valor] ?? ""}
                onChange={(e) => setNuevoMonto({ ...nuevoMonto, [c.valor]: e.target.value })}
                className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1"
              />
              <button
                onClick={() => handleAgregar(c.valor)}
                className="bg-purple-100 text-purple-800 rounded px-3 py-1 hover:bg-purple-200"
              >
                Agregar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeccionDiasLibres() {
  const [dias, setDias] = useState([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [motivo, setMotivo] = useState("DESCANSO");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    const { anio, mes } = hoyAnioMes();
    setDias(await listarDiasLibres(anio, mes));
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleMarcar() {
    await crearDiaLibre({ fecha, motivo });
    cargar();
  }

  async function handleEliminar(id) {
    await eliminarDiaLibre(id);
    cargar();
  }

  if (cargando) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {dias.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span className="w-28">{d.fecha.slice(0, 10)}</span>
            <span className="text-gray-500">{d.motivo}</span>
            <button type="button" onClick={() => handleEliminar(d.id)} className="text-red-500 hover:underline">
              Eliminar
            </button>
          </div>
        ))}
        {dias.length === 0 && <p className="text-sm text-gray-400">Sin días libres este mes</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {MOTIVOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button type="button" onClick={handleMarcar} className="bg-purple-100 text-purple-800 rounded px-3 py-1 text-sm hover:bg-purple-200">
          Marcar
        </button>
      </div>
    </div>
  );
}

function SeccionAlertas() {
  const [{ anio, mes }, setPeriodo] = useState(hoyAnioMes());
  const [alertas, setAlertas] = useState([]);
  const [config, setConfig] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const [a, c] = await Promise.all([listarAlertas(anio, mes), listarAlertasConfig()]);
    setAlertas(a);
    setConfig(c);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  async function handleToggle(tipo, activo) {
    await guardarAlertaConfig({ tipo, activo: !activo });
    cargar();
  }

  async function handlePorcentaje(tipo, valor) {
    if (valor === "") return;
    await guardarAlertaConfig({ tipo, porcentajeAlerta: Number(valor) });
    cargar();
  }

  if (cargando) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={mes}
          onChange={(e) => setPeriodo({ anio, mes: Number(e.target.value) })}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={anio}
          onChange={(e) => setPeriodo({ anio: Number(e.target.value), mes })}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {[anio - 1, anio, anio + 1].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {alertas.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Sin alertas para este mes 🎉</p>
        )}
        {alertas.map((a, i) => (
          <div key={i} className={`border rounded-lg px-4 py-3 text-sm flex gap-2 ${ESTILO_NIVEL[a.nivel]}`}>
            <span>{a.icono}</span>
            <span>{a.mensaje}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        {config.map((c) => {
          const etiqueta = ETIQUETAS_ALERTA[c.tipo] || { nombre: c.tipo, sufijo: null };
          return (
            <div key={c.tipo} className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={c.activo}
                  onChange={() => handleToggle(c.tipo, c.activo)}
                  className="accent-purple-600"
                />
                {etiqueta.nombre}
              </label>
              {etiqueta.sufijo && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    defaultValue={c.porcentajeAlerta ?? ""}
                    onBlur={(e) => handlePorcentaje(c.tipo, e.target.value)}
                    className="w-16 border border-gray-300 rounded px-2 py-1"
                  />
                  <span className="text-gray-400 text-xs">{etiqueta.sufijo}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AjustesPage() {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ajustes del tracker</h2>
        <SeccionAjustesTracker />
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Botones rápidos</h2>
        <SeccionBotonesRapidos />
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Alertas</h2>
        <SeccionAlertas />
      </section>
    </div>
  );
}
