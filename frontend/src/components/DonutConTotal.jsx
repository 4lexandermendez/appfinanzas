import { useId } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

function fmtDefault(v) {
  return `$${Number(v).toFixed(2)}`;
}

// Dona con anillo grueso, puntas redondeadas, un solo degradado morado (en
// vez de un color por categoria) y el total en el centro (estilo "wallet
// app"), en vez del anillo delgado sin foco de Recharts por defecto. El
// overlay del centro se ajusta un poco hacia arriba (paddingBottom) para
// compensar el espacio que ocupa la leyenda debajo del anillo.
export default function DonutConTotal({
  data, total, etiquetaTotal = "Total", formato = fmtDefault, altura = 240,
}) {
  const gradientId = useId();

  return (
    <div className="relative" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="85%"
            cornerRadius={10}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={`url(#${gradientId})`} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formato(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        style={{ paddingBottom: 36 }}
      >
        <span className="text-xl font-bold text-gray-900">{formato(total)}</span>
        <span className="text-xs text-gray-400">{etiquetaTotal}</span>
      </div>
    </div>
  );
}
