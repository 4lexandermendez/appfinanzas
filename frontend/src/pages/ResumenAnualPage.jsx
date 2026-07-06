import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { obtenerResumenAnual, obtenerResumenAnualCompleto } from "../api/dashboard";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const COLORES_DISTRIBUCION = { Ahorros: "#3b82f6", "Gastos fijos": "#ec4899", "Gastos variables": "#eab308", Deudas: "#be185d" };

function anioActual() {
  return new Date().getFullYear();
}

function TablaSeccion({ titulo, colorCabecera, seccion }) {
  const dataGrafica = seccion.meses.map((m) => ({
    mes: MESES_CORTOS[m.mes - 1],
    Estimado: m.estimado,
    Real: m.real,
  }));

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className={`px-4 py-2 font-semibold text-sm ${colorCabecera}`}>{titulo}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <table className="text-sm w-full">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="px-4 py-1">Mes</th>
              <th className="px-2 py-1 text-right">Estimado</th>
              <th className="px-4 py-1 text-right">Real</th>
            </tr>
          </thead>
          <tbody>
            {seccion.meses.map((m) => (
              <tr key={m.mes} className="border-t border-gray-100">
                <td className="px-4 py-1">{MESES[m.mes - 1]}</td>
                <td className="px-2 py-1 text-right">${m.estimado.toFixed(2)}</td>
                <td className="px-4 py-1 text-right">${m.real.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="px-4 py-1">Total</td>
              <td className="px-2 py-1 text-right">${seccion.total.estimado.toFixed(2)}</td>
              <td className="px-4 py-1 text-right">${seccion.total.real.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div className="p-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataGrafica}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Estimado" fill="#c4b5fd" />
              <Bar dataKey="Real" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function ResumenAnualPage() {
  const [anio, setAnio] = useState(anioActual());
  const [resumen, setResumen] = useState(null);
  const [completo, setCompleto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    Promise.all([obtenerResumenAnual(anio), obtenerResumenAnualCompleto(anio)]).then(([r, c]) => {
      setResumen(r);
      setCompleto(c);
      setCargando(false);
    });
  }, [anio]);

  if (cargando || !resumen || !completo) {
    return <div className="p-6 text-center text-gray-500">Cargando resumen anual (puede tardar unos segundos)...</div>;
  }

  const presupuestoAnual = [
    { nombre: "Ingresos", ...completo.ingresos.total },
    { nombre: "Ahorros", ...completo.ahorros.total },
    { nombre: "Gastos fijos", ...completo.gastosFijos.total },
    { nombre: "Gastos variables", ...completo.gastosVariables.total },
    { nombre: "Deudas", ...completo.deudas.total },
  ];

  const dataDistribucion = presupuestoAnual
    .filter((c) => c.nombre !== "Ingresos" && c.real > 0)
    .map((c) => ({ name: c.nombre, value: c.real }));

  const dataLinea = resumen.meses.map((m) => ({
    mes: MESES_CORTOS[m.mes - 1],
    Ingresos: m.ingresosReal,
    Gastos: m.gastosReal,
  }));

  return (
    <div className="space-y-6">
      <select
        value={anio}
        onChange={(e) => setAnio(Number(e.target.value))}
        className="border border-gray-300 rounded px-3 py-2 text-sm"
      >
        {[anio - 1, anio, anio + 1].map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total ahorrado en el año</p>
          <p className="text-xl font-bold text-green-600">${resumen.totalAhorradoAnual.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Mes con más gasto</p>
          <p className="text-xl font-bold text-gray-900">{MESES[resumen.mesMasGasto - 1]}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Mes con más ahorro</p>
          <p className="text-xl font-bold text-gray-900">{MESES[resumen.mesMasAhorro - 1]}</p>
        </div>
      </div>

      {resumen.tendencia && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          📈 Tendencia: te excediste en <strong>{resumen.tendencia.categoria}</strong> en{" "}
          {resumen.tendencia.mesesExcedidos} de los meses con datos este año.
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-2 font-semibold text-sm bg-gray-100 text-gray-700 text-center">
          Presupuesto anual
        </div>
        <table className="text-sm w-full">
          <tbody>
            {presupuestoAnual.map((c) => (
              <tr key={c.nombre} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{c.nombre}</td>
                <td className="px-4 py-2 text-right">${c.estimado.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">${c.real.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-2 font-semibold text-sm bg-gray-100 text-gray-700 text-center">
          Resumen del año
        </div>
        <table className="text-sm w-full">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="px-4 py-1">Categoría</th>
              <th className="px-4 py-1 text-right">Estimado</th>
              <th className="px-4 py-1 text-right">Real</th>
            </tr>
          </thead>
          <tbody>
            {presupuestoAnual.map((c) => (
              <tr key={c.nombre} className="border-t border-gray-100">
                <td className="px-4 py-1">{c.nombre}</td>
                <td className="px-4 py-1 text-right">${c.estimado.toFixed(2)}</td>
                <td className="px-4 py-1 text-right">${c.real.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablaSeccion titulo="Ingresos" colorCabecera="bg-green-100 text-green-800" seccion={completo.ingresos} />
      <TablaSeccion titulo="Ahorros" colorCabecera="bg-blue-100 text-blue-800" seccion={completo.ahorros} />
      <TablaSeccion titulo="Gastos fijos" colorCabecera="bg-pink-100 text-pink-800" seccion={completo.gastosFijos} />
      <TablaSeccion titulo="Gastos variables" colorCabecera="bg-yellow-100 text-yellow-800" seccion={completo.gastosVariables} />
      <TablaSeccion titulo="Deudas" colorCabecera="bg-pink-100 text-pink-800" seccion={completo.deudas} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Distribución del dinero (real)</h2>
          {dataDistribucion.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">Sin gastos registrados este año</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dataDistribucion} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                  {dataDistribucion.map((d) => (
                    <Cell key={d.name} fill={COLORES_DISTRIBUCION[d.name] || "#a855f7"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Ingresos vs Gastos ({anio})</h2>
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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Estimado vs Real</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={presupuestoAnual.map((c) => ({ nombre: c.nombre, Estimado: c.estimado, Real: c.real }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="Estimado" fill="#c4b5fd" />
            <Bar dataKey="Real" fill="#a855f7" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
