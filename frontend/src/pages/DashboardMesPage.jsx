import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { obtenerResumenMes } from "../api/dashboard";
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
  const [quincenal, setQuincenal] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      obtenerResumenMes(anio, mes),
      obtenerDetalleQuincenal(anio, mes).catch(() => null),
    ])
      .then(([m, q]) => {
        setResumenMes(m);
        setQuincenal(q);
      })
      .finally(() => setCargando(false));
  }, [anio, mes]);

  if (cargando || !resumenMes) {
    return <div className="p-6 text-center text-gray-500">Cargando dashboard...</div>;
  }

  const dataDona = resumenMes.gastosVariables.porCategoria
    .filter((c) => c.real > 0)
    .map((c) => ({ name: c.nombre, value: c.real }));

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
    </div>
  );
}
