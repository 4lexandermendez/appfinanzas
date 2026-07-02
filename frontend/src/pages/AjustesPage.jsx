import { useEffect, useState } from "react";
import { obtenerAjustesTracker, guardarAjustesTracker } from "../api/ajustesTracker";
import { listarBotonesRapidos, guardarBotonRapido } from "../api/botonesRapidos";
import { listarDiasLibres, crearDiaLibre, eliminarDiaLibre } from "../api/diasLibres";

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
    </div>
  );
}
