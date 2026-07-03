import { useEffect, useState } from "react";
import { obtenerAjustesTracker, guardarAjustesTracker } from "../api/ajustesTracker";
import { listarBotonesRapidos, guardarBotonRapido } from "../api/botonesRapidos";
import { listarDiasLibres, crearDiaLibre, eliminarDiaLibre } from "../api/diasLibres";
import { listarAlertas, listarAlertasConfig, guardarAlertaConfig } from "../api/alertas";

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

const CAMPOS_AJUSTE = [
  { campo: "montoPasajeIda", etiqueta: "Pasaje ida (entre semana)" },
  { campo: "montoDesayuno", etiqueta: "Desayuno (entre semana)" },
  { campo: "montoAlmuerzo", etiqueta: "Almuerzo (entre semana)" },
  { campo: "montoPasajeRegreso", etiqueta: "Pasaje regreso (entre semana)" },
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
      <div className="grid grid-cols-2 gap-2">
        {CAMPOS_AJUSTE.map((c) => (
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

      <div className="border-t border-gray-100 pt-3">
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
        <p className="text-xs text-gray-400 mt-1">Debe ser un día sábado. Ej. "el 4 de julio no voy" → fecha 2026-07-04, desmarcar.</p>
      </div>

      {mensaje && <p className="text-sm text-purple-700">{mensaje}</p>}
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Guardar ajustes
      </button>
    </form>
  );
}

function SeccionBotonesRapidos() {
  const [botones, setBotones] = useState([]);
  const [form, setForm] = useState({});
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    const data = await listarBotonesRapidos();
    setBotones(data);
    const inicial = {};
    for (const c of CONCEPTOS_TRACKER) {
      const existente = data.find((b) => b.concepto === c.valor);
      inicial[c.valor] = {
        monto1: existente?.monto1 ?? "",
        monto2: existente?.monto2 ?? "",
        monto3: existente?.monto3 ?? "",
      };
    }
    setForm(inicial);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleGuardar(concepto) {
    const { monto1, monto2, monto3 } = form[concepto];
    if (!monto1) return;
    await guardarBotonRapido({
      concepto,
      monto1: Number(monto1),
      monto2: monto2 ? Number(monto2) : null,
      monto3: monto3 ? Number(monto3) : null,
    });
    cargar();
  }

  if (cargando) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Montos frecuentes por concepto, tipo cajero automático (hasta 3 por concepto).
      </p>
      {CONCEPTOS_TRACKER.map((c) => (
        <div key={c.valor} className="flex items-center gap-2 text-sm">
          <span className="w-32">{c.etiqueta}</span>
          {["monto1", "monto2", "monto3"].map((campo) => (
            <input
              key={campo}
              type="number"
              step="0.01"
              min="0"
              placeholder={campo === "monto1" ? "Requerido" : "Opcional"}
              value={form[c.valor]?.[campo] ?? ""}
              onChange={(e) =>
                setForm({ ...form, [c.valor]: { ...form[c.valor], [campo]: e.target.value } })
              }
              className="w-24 border border-gray-300 rounded px-2 py-1"
            />
          ))}
          <button
            onClick={() => handleGuardar(c.valor)}
            className="bg-purple-100 text-purple-800 rounded px-2 py-1 hover:bg-purple-200"
          >
            Guardar
          </button>
        </div>
      ))}
    </div>
  );
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function SeccionDiasLibres() {
  const [dias, setDias] = useState([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [motivo, setMotivo] = useState("DESCANSO");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    const ahora = new Date();
    setDias(await listarDiasLibres(ahora.getFullYear(), ahora.getMonth() + 1));
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
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
      <p className="text-xs text-gray-400">
        Días marcados como no laborales este mes (se excluyen del estimado automático).
      </p>
      <div className="space-y-1">
        {dias.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span className="w-28">{d.fecha.slice(0, 10)}</span>
            <span className="text-gray-500">{d.motivo}</span>
            <button onClick={() => handleEliminar(d.id)} className="text-red-500 hover:underline">
              Eliminar
            </button>
          </div>
        ))}
        {dias.length === 0 && <p className="text-sm text-gray-400">Sin días libres este mes</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
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
        <button type="submit" className="bg-purple-100 text-purple-800 rounded px-3 py-1 text-sm hover:bg-purple-200">
          Marcar
        </button>
      </form>
    </div>
  );
}

function hoyAnioMes() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Días libres</h2>
        <SeccionDiasLibres />
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Alertas</h2>
        <SeccionAlertas />
      </section>
    </div>
  );
}
