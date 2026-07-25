import { useId } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function fmtDefault(v) {
  return `$${Number(v).toFixed(2)}`;
}

// Estimado y Real superpuestos como areas suaves en vez de barras: el
// Estimado va atras en azul (linea punteada, degradado tenue) y el Real va
// adelante en verde (si viene igual o por debajo del estimado) o rojo (si se
// excedio), con su propio degradado — asi resalta de un vistazo si el mes/
// categoria se paso del presupuesto o no.
export default function GraficaEstimadoReal({
  data, xKey = "label", claveEstimado = "Estimado", claveReal = "Real",
  formato = fmtDefault, altura = 240,
}) {
  const idEstimado = useId();
  const idReal = useId();
  const totalEstimado = data.reduce((s, d) => s + (Number(d[claveEstimado]) || 0), 0);
  const totalReal = data.reduce((s, d) => s + (Number(d[claveReal]) || 0), 0);
  const colorReal = totalReal > totalEstimado ? "#ef4444" : "#22c55e";

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={idEstimado} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={idReal} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorReal} stopOpacity={0.35} />
            <stop offset="100%" stopColor={colorReal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => formato(v)} />
        <Legend />
        <Area
          type="monotone" dataKey={claveEstimado} stroke="#3b82f6" strokeWidth={2}
          strokeDasharray="5 4" fill={`url(#${idEstimado})`}
        />
        <Area type="monotone" dataKey={claveReal} stroke={colorReal} strokeWidth={2} fill={`url(#${idReal})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
