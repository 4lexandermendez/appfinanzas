import { useEffect, useState } from "react";
import { listarAlertas, listarAlertasConfig, guardarAlertaConfig } from "../api/alertas";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ETIQUETAS = {
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

function hoy() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

export default function AlertasPage() {
  const [{ anio, mes }, setPeriodo] = useState(hoy());
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

  if (cargando) {
    return <div className="p-6 text-center text-gray-500">Cargando alertas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select
          value={mes}
          onChange={(e) => setPeriodo({ anio, mes: Number(e.target.value) })}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={anio}
          onChange={(e) => setPeriodo({ anio: Number(e.target.value), mes })}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {[anio - 1, anio, anio + 1].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <section className="space-y-2">
        {alertas.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Sin alertas para este mes 🎉</p>
        )}
        {alertas.map((a, i) => (
          <div key={i} className={`border rounded-lg px-4 py-3 text-sm flex gap-2 ${ESTILO_NIVEL[a.nivel]}`}>
            <span>{a.icono}</span>
            <span>{a.mensaje}</span>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Configuración de alertas</h2>
        <div className="space-y-3">
          {config.map((c) => {
            const etiqueta = ETIQUETAS[c.tipo] || { nombre: c.tipo, sufijo: null };
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
      </section>
    </div>
  );
}
