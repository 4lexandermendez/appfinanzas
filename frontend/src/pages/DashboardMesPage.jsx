import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { obtenerResumenMes, obtenerResumenAnual } from "../api/dashboard";
import { obtenerDetalleQuincenal } from "../api/tracker";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const COLORES = ["#a855f7", "#f97316", "#22c55e", "#3b82f6", "#ec4899", "#eab308", "#14b8a6"];

function hoy() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

export default function DashboardMesPage() {
  const [{ anio, mes }, setPeriodo] = useState(hoy());
  const [resumenMes, setResumenMes] = useState(null);
  const [resumenAnual, setResumenAnual] = useState(null);
  const [quincenal, setQuincenal] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      obtenerResumenMes(anio, mes),
      obtenerResumenAnual(anio),
      obtenerDetalleQuincenal(anio, mes).catch(() => null),
    ])
      .then(([m, a, q]) => {
        setResumenMes(m);
        setResumenAnual(a);
        setQuincenal(q);
      })
      .finally(() => setCargando(false));
  }, [anio, mes]);

  if (cargando || !resumenMes || !resumenAnual) {
    return <div className="p-6 text-center text-gray-500">Cargando dashboard...</div>;
  }

  const dataDona = resumenMes.gastosVariables.porCategoria
    .filter((c) => c.real > 0)
    .map((c) => ({ name: c.nombre, value: c.real }));

  const dataBarras = [
    { nombre: "Ingresos", estimado: resumenMes.ingresos.estimado, real: resumenMes.ingresos.real },
    { nombre: "Ahorros", estimado: resumenMes.ahorros.estimado, real: resumenMes.ahorros.real },
    { nombre: "Gastos fijos", estimado: resumenMes.gastosFijos.estimado, real: resumenMes.gastosFijos.real },
    ...resumenMes.gastosVariables.porCategoria
      .filter((c) => c.estimado !== null)
      .map((c) => ({ nombre: c.nombre, estimado: c.estimado, real: c.real })),
  ];

  const dataLinea = resumenAnual.meses.map((m) => ({
    mes: MESES[m.mes - 1],
    Ingresos: m.ingresosReal,
    Gastos: m.gastosReal,
  }));

  const progresoAhorro =
    resumenMes.ahorros.estimado > 0
      ? Math.min(100, Math.round((resumenMes.ahorros.real / resumenMes.ahorros.estimado) * 100))
      : 0;

  const sinEstimadoCompleto = resumenMes.gastosVariables.porCategoria.some((c) => c.estimado === null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select
          value={mes}
          onChange={(e) => setPeriodo({ anio, mes: Number(e.target.value) })}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={anio}
          onChange={(e) => setPeriodo({ anio: Number(e.target.value), mes })}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {[anio - 1, anio, anio + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Ahorro del mes</h2>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${progresoAhorro}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Ahorraste ${resumenMes.ahorros.real.toFixed(2)} de ${resumenMes.ahorros.estimado.toFixed(2)} planificados (
          {progresoAhorro}%)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Gasto por categoría (real)</h2>
        {dataDona.length === 0 ? (
          <p className="text-sm text-gray-400">Sin gastos registrados este mes</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={dataDona} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                {dataDona.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Estimado vs Real</h2>
        {sinEstimadoCompleto && (
          <p className="text-xs text-gray-400 mb-2">
            Algunas categorías variables no tienen estimado configurado y no aparecen aquí.
          </p>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dataBarras}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="estimado" fill="#c4b5fd" name="Estimado" />
            <Bar dataKey="real" fill="#a855f7" name="Real" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {quincenal && (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Gastos detallados quincenales</h2>
          <table className="text-sm min-w-full">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left pr-3"></th>
                <th className="text-right px-2">Quincena 1</th>
                <th className="text-right px-2">Real</th>
                <th className="text-right px-2">Ahorrado</th>
                <th className="text-right px-2">Quincena 2</th>
                <th className="text-right px-2">Real</th>
                <th className="text-right px-2">Ahorrado</th>
                <th className="text-right pl-2">Total real</th>
              </tr>
            </thead>
            <tbody>
              {[
                { etiqueta: "Transporte", datos: quincenal.transporte },
                { etiqueta: "Comida", datos: quincenal.comida },
              ].map((fila) => (
                <tr key={fila.etiqueta} className="border-t border-gray-100">
                  <td className="pr-3 text-gray-700">{fila.etiqueta}</td>
                  <td className="text-right px-2">${fila.datos.quincena1.estimado.toFixed(2)}</td>
                  <td className="text-right px-2">${fila.datos.quincena1.real.toFixed(2)}</td>
                  <td className="text-right px-2">${fila.datos.quincena1.ahorrado.toFixed(2)}</td>
                  <td className="text-right px-2">${fila.datos.quincena2.estimado.toFixed(2)}</td>
                  <td className="text-right px-2">${fila.datos.quincena2.real.toFixed(2)}</td>
                  <td className="text-right px-2">${fila.datos.quincena2.ahorrado.toFixed(2)}</td>
                  <td className="text-right pl-2 font-medium">${fila.datos.total.real.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Ingresos vs Gastos ({anio})</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dataLinea}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="Ingresos" stroke="#22c55e" strokeWidth={2} />
            <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
