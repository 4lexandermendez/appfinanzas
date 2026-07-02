import { useEffect, useState } from "react";
import { obtenerResumenAnual } from "../api/dashboard";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function anioActual() {
  return new Date().getFullYear();
}

export default function ResumenAnualPage() {
  const [anio, setAnio] = useState(anioActual());
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    obtenerResumenAnual(anio).then((data) => {
      setResumen(data);
      setCargando(false);
    });
  }, [anio]);

  if (cargando || !resumen) {
    return <div className="p-6 text-center text-gray-500">Cargando resumen anual...</div>;
  }

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
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Mes</th>
              <th className="px-4 py-2">Ingresos</th>
              <th className="px-4 py-2">Gastos</th>
              <th className="px-4 py-2">Ahorro</th>
            </tr>
          </thead>
          <tbody>
            {resumen.meses.map((m) => (
              <tr
                key={m.mes}
                className={`border-t border-gray-100 ${
                  m.mes === resumen.mesMasGasto ? "bg-red-50" : m.mes === resumen.mesMasAhorro ? "bg-green-50" : ""
                }`}
              >
                <td className="px-4 py-2">{MESES[m.mes - 1]}</td>
                <td className="px-4 py-2">${m.ingresosReal.toFixed(2)}</td>
                <td className="px-4 py-2">${m.gastosReal.toFixed(2)}</td>
                <td className="px-4 py-2">${m.ahorroReal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
