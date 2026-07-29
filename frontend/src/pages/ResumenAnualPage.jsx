import { useEffect, useId, useState } from "react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { obtenerResumenAnualCompleto } from "../api/dashboard";
import { anioActual } from "../utils/fecha";
import DonutConTotal from "../components/DonutConTotal";
import GraficaEstimadoReal from "../components/GraficaEstimadoReal";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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
          <GraficaEstimadoReal data={dataGrafica} xKey="mes" altura={240} />
        </div>
      </div>
    </div>
  );
}

// Tarjeta tipo "stat card": numero grande + variacion % + mini-grafica de
// area suave debajo, sin ejes ni grilla — para destacar una sola serie en
// vez de comparar dos lineas en una grafica tradicional.
function TarjetaSparkline({ titulo, datos, color, rangoTexto }) {
  const gradientId = useId();
  const valores = datos.map((d) => d.valor);
  const primero = valores.find((v) => v > 0) ?? 0;
  const ultimo = [...valores].reverse().find((v) => v > 0) ?? 0;
  const cambio = primero > 0 ? Math.round(((ultimo - primero) / primero) * 100) : 0;
  const total = valores.reduce((s, v) => s + v, 0);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500">{titulo}</span>
        {cambio !== 0 && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cambio >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {cambio >= 0 ? "+" : ""}{cambio}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">${total.toFixed(2)}</p>
      <p className="text-xs text-gray-400 mb-1">{rangoTexto}</p>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={datos} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} labelFormatter={(l) => l} />
          <Area type="monotone" dataKey="valor" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// A partir del payload ya agregado de resumen-anual-completo (un puñado de
// consultas) se derivan mes a mes ingresos/gastos/ahorro reales, sin pedirle
// nada nuevo al backend — antes esto salía de un segundo endpoint
// (resumen-anual) que hacía 1 ronda de consultas POR MES con presupuesto
// (podía tardar 30s+ con varios meses de datos) solo para recalcular casi lo
// mismo que completo ya trae.
function derivarMeses(completo) {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return {
      mes,
      ingresosReal: completo.ingresos.meses[i].real,
      gastosReal: redondear(
        completo.gastosFijos.meses[i].real + completo.gastosVariables.meses[i].real + completo.deudas.meses[i].real
      ),
      ahorroReal: completo.ahorros.meses[i].real,
    };
  });
}

function redondear(v) {
  return Math.round(v * 100) / 100;
}

// La tendencia original tambien contaba meses excedidos por categoria
// variable individual (Temu, Universidad, etc.), pero esa granularidad solo
// existía en el endpoint lento que se elimina aquí — completo únicamente
// trae el total mensual de gastos variables, no por categoría. Se conserva
// la parte de Gastos fijos y Deudas, que sí siguen siendo exactas.
function calcularTendencia(completo) {
  const excesos = (seccion) => seccion.meses.filter((m) => m.estimado > 0 && m.real > m.estimado).length;
  const excesosFijos = excesos(completo.gastosFijos);
  const excesosDeudas = excesos(completo.deudas);
  if (excesosFijos === 0 && excesosDeudas === 0) return null;
  return excesosFijos >= excesosDeudas
    ? { categoria: "Gastos fijos", mesesExcedidos: excesosFijos }
    : { categoria: "Deudas", mesesExcedidos: excesosDeudas };
}

export default function ResumenAnualPage() {
  const [anio, setAnio] = useState(anioActual());
  const [completo, setCompleto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    obtenerResumenAnualCompleto(anio).then((c) => {
      setCompleto(c);
      setCargando(false);
    });
  }, [anio]);

  if (cargando || !completo) {
    return <div className="p-6 text-center text-gray-500">Cargando resumen anual...</div>;
  }

  const meses = derivarMeses(completo);
  const totalAhorradoAnual = redondear(meses.reduce((s, m) => s + m.ahorroReal, 0));
  const mesMasGasto = meses.reduce((max, m) => (m.gastosReal > max.gastosReal ? m : max), meses[0]).mes;
  const mesMasAhorro = meses.reduce((max, m) => (m.ahorroReal > max.ahorroReal ? m : max), meses[0]).mes;
  const tendencia = calcularTendencia(completo);

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

  const dataLinea = meses.map((m) => ({
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
          <p className="text-xl font-bold text-green-600">${totalAhorradoAnual.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Mes con más gasto</p>
          <p className="text-xl font-bold text-gray-900">{MESES[mesMasGasto - 1]}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Mes con más ahorro</p>
          <p className="text-xl font-bold text-gray-900">{MESES[mesMasAhorro - 1]}</p>
        </div>
      </div>

      {tendencia && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          📈 Tendencia: te excediste en <strong>{tendencia.categoria}</strong> en{" "}
          {tendencia.mesesExcedidos} de los meses con datos este año.
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
            <DonutConTotal
              data={dataDistribucion}
              total={dataDistribucion.reduce((s, d) => s + d.value, 0)}
              altura={280}
            />
          )}
        </div>

        <div className="space-y-4">
          <TarjetaSparkline
            titulo={`Ingresos (${anio})`}
            datos={dataLinea.map((d) => ({ mes: d.mes, valor: d.Ingresos }))}
            color="#22c55e"
            rangoTexto={`${dataLinea[0]?.mes} - ${dataLinea[dataLinea.length - 1]?.mes}`}
          />
          <TarjetaSparkline
            titulo={`Gastos (${anio})`}
            datos={dataLinea.map((d) => ({ mes: d.mes, valor: d.Gastos }))}
            color="#ef4444"
            rangoTexto={`${dataLinea[0]?.mes} - ${dataLinea[dataLinea.length - 1]?.mes}`}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Estimado vs Real</h2>
        <GraficaEstimadoReal
          data={presupuestoAnual.map((c) => ({ nombre: c.nombre, Estimado: c.estimado, Real: c.real }))}
          xKey="nombre"
          altura={280}
        />
      </div>
    </div>
  );
}
