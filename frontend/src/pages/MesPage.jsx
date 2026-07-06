import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { obtenerResumenMes } from "../api/dashboard";
import { listarIngresos } from "../api/ingresos";
import { listarAhorros } from "../api/ahorros";
import { listarGastosFijosMensual } from "../api/gastosFijos";
import { listarDeudasMensual } from "../api/deudas";
import { listarTransacciones, actualizarTransaccion } from "../api/transacciones";
import { obtenerNotas, guardarNotas } from "../api/presupuestoMensual";
import { obtenerDetalleQuincenal } from "../api/tracker";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const COLORES_DISTRIBUCION = { Ahorros: "#3b82f6", "Gastos fijos": "#ec4899", "Gastos variables": "#eab308", Deudas: "#be185d" };

function hoy() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

function fmt(v) {
  return `$${Number(v).toFixed(2)}`;
}

function fmtFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

function FilaCategoria({ nombre, presupuesto, real, colorFondo }) {
  return (
    <tr className="border-t border-gray-100">
      <td className={`px-4 py-2 font-medium ${colorFondo}`}>{nombre}</td>
      <td className="px-4 py-2 text-right">{fmt(presupuesto)}</td>
      <td className="px-4 py-2 text-right">{fmt(real)}</td>
    </tr>
  );
}

function TablaDetalle({ titulo, colorCabecera, filas, columnas, campoTotal = "montoEstimado" }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className={`px-4 py-2 font-semibold text-sm ${colorCabecera}`}>{titulo}</div>
      <table className="text-sm w-full">
        <thead className="text-gray-500 text-left">
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} className={`px-4 py-1 ${c.derecha ? "text-right" : ""}`}>{c.etiqueta}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-gray-100">
              {columnas.map((c) => (
                <td key={c.clave} className={`px-4 py-1 ${c.derecha ? "text-right" : ""}`}>
                  {c.clave === "nombre" ? f[c.clave] : fmt(f[c.clave] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={columnas.length} className="px-4 py-2 text-gray-400">Sin datos este mes</td>
            </tr>
          )}
          <tr className="border-t-2 border-gray-300 font-semibold">
            <td className="px-4 py-1">Total</td>
            {columnas.slice(1).map((c) => (
              <td key={c.clave} className="px-4 py-1 text-right">
                {fmt(filas.reduce((s, f) => s + Number(f[c.clave] || 0), 0))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function MesPage() {
  const [{ anio, mes }, setPeriodo] = useState(hoy());
  const [resumen, setResumen] = useState(null);
  const [ingresos, setIngresos] = useState([]);
  const [ahorros, setAhorros] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [notas, setNotas] = useState("");
  const [notasGuardando, setNotasGuardando] = useState(false);
  const [quincenal, setQuincenal] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      obtenerResumenMes(anio, mes),
      listarIngresos(anio, mes),
      listarAhorros(anio, mes),
      listarGastosFijosMensual(anio, mes),
      listarDeudasMensual(anio, mes),
      listarTransacciones(anio, mes),
      obtenerNotas(anio, mes),
      obtenerDetalleQuincenal(anio, mes).catch(() => null),
    ]).then(([r, i, a, gf, d, t, n, q]) => {
      setResumen(r);
      setIngresos(i);
      setAhorros(a);
      setGastosFijos(gf.gastosFijos);
      setDeudas(d);
      setTransacciones(t);
      setNotas(n);
      setQuincenal(q);
      setCargando(false);
    });
  }, [anio, mes]);

  async function handleGuardarNotas() {
    setNotasGuardando(true);
    await guardarNotas(anio, mes, notas);
    setNotasGuardando(false);
  }

  async function handleGuardarNotaTransaccion(id, notaNueva) {
    await actualizarTransaccion(id, { notas: notaNueva });
    setTransacciones((prev) => prev.map((t) => (t.id === id ? { ...t, notas: notaNueva } : t)));
  }

  if (cargando || !resumen) {
    return <div className="p-6 text-center text-gray-500">Cargando mes...</div>;
  }

  const categoriasSalida = [
    { nombre: "Ahorros", estimado: resumen.ahorros.estimado, real: resumen.ahorros.real },
    { nombre: "Gastos fijos", estimado: resumen.gastosFijos.estimado, real: resumen.gastosFijos.real },
    { nombre: "Gastos variables", estimado: resumen.gastosVariables.estimadoConocido, real: resumen.gastosVariables.real },
    { nombre: "Deudas", estimado: resumen.deudas.estimado, real: resumen.deudas.real },
  ];

  const sinUsarEstimado =
    resumen.ingresos.estimado - categoriasSalida.reduce((s, c) => s + c.estimado, 0);
  const sinUsarReal = resumen.ingresos.real - categoriasSalida.reduce((s, c) => s + c.real, 0);

  const progresoAhorro =
    resumen.ahorros.estimado > 0
      ? Math.min(100, Math.round((resumen.ahorros.real / resumen.ahorros.estimado) * 100))
      : 0;

  const dataBarras = categoriasSalida.map((c) => ({ nombre: c.nombre, Presupuesto: c.estimado, Real: c.real }));
  const dataDonaPresupuesto = categoriasSalida.filter((c) => c.estimado > 0).map((c) => ({ name: c.nombre, value: c.estimado }));
  const dataDonaReal = categoriasSalida.filter((c) => c.real > 0).map((c) => ({ name: c.nombre, value: c.real }));

  const filasIngresos = ingresos.map((i) => ({
    nombre: i.nombre, montoEstimado: i.montoEstimado, montoReal: i.montoReal || 0,
    diferencia: Number(i.montoReal || 0) - Number(i.montoEstimado),
  }));
  const filasAhorros = ahorros.map((a) => ({
    nombre: a.nombre, montoEstimado: a.montoEstimado, montoReal: a.montoReal || 0,
    diferencia: Number(a.montoReal || 0) - Number(a.montoEstimado),
  }));
  const filasGastosFijos = gastosFijos.map((g) => ({
    nombre: g.nombre, montoEstimado: g.montoEstimado, montoReal: g.montoReal || 0,
    diferencia: Number(g.montoEstimado) - Number(g.montoReal || 0),
  }));
  const filasGastosVariables = resumen.gastosVariables.porCategoria.map((c) => ({
    nombre: c.nombre, montoEstimado: c.estimado || 0, montoReal: c.real,
    diferencia: Number(c.estimado || 0) - Number(c.real),
  }));
  const filasDeudas = deudas.map((d) => ({
    nombre: d.nombre, montoEstimado: d.montoEstimado || 0, montoReal: d.montoReal || 0, actual: d.actual,
  }));

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

      <h1 className="text-4xl font-bold text-center text-gray-900">{MESES[mes - 1]}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2 text-right">Presupuestado</th>
                <th className="px-4 py-2 text-right">Real</th>
              </tr>
            </thead>
            <tbody>
              <FilaCategoria nombre="Ingresos" presupuesto={resumen.ingresos.estimado} real={resumen.ingresos.real} colorFondo="text-green-700" />
              {categoriasSalida.map((c) => (
                <FilaCategoria key={c.nombre} nombre={c.nombre} presupuesto={c.estimado} real={c.real} colorFondo="text-gray-700" />
              ))}
              <tr className="border-t-2 border-gray-300">
                <td className="px-4 py-2 font-semibold">Sin usar</td>
                <td className={`px-4 py-2 text-right font-semibold ${sinUsarEstimado < 0 ? "text-red-600" : ""}`}>
                  {sinUsarEstimado < 0 ? `(${fmt(Math.abs(sinUsarEstimado))})` : fmt(sinUsarEstimado)}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${sinUsarReal < 0 ? "text-red-600" : ""}`}>
                  {sinUsarReal < 0 ? `(${fmt(Math.abs(sinUsarReal))})` : fmt(sinUsarReal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-2 font-semibold text-sm bg-gray-100 text-gray-700 text-center">Resumen del mes</div>
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="px-4 py-1">Categoría</th>
                <th className="px-4 py-1 text-right">Presupuesto</th>
                <th className="px-4 py-1 text-right">Real</th>
              </tr>
            </thead>
            <tbody>
              <FilaCategoria nombre="Ingresos" presupuesto={resumen.ingresos.estimado} real={resumen.ingresos.real} colorFondo="" />
              {categoriasSalida.map((c) => (
                <FilaCategoria key={c.nombre} nombre={c.nombre} presupuesto={c.estimado} real={c.real} colorFondo="" />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TablaDetalle
          titulo="Ingresos"
          colorCabecera="bg-green-100 text-green-800"
          filas={filasIngresos}
          columnas={[
            { clave: "nombre", etiqueta: "Nombre" },
            { clave: "montoEstimado", etiqueta: "Estimado", derecha: true },
            { clave: "montoReal", etiqueta: "Real", derecha: true },
            { clave: "diferencia", etiqueta: "Diferencia", derecha: true },
          ]}
        />
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Notas</h2>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={handleGuardarNotas}
            rows={4}
            placeholder="Escribí tus notas acá"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {notasGuardando && <p className="text-xs text-gray-400 mt-1">Guardando...</p>}
        </div>
        <TablaDetalle
          titulo="Ahorros"
          colorCabecera="bg-blue-100 text-blue-800"
          filas={filasAhorros}
          columnas={[
            { clave: "nombre", etiqueta: "Nombre" },
            { clave: "montoEstimado", etiqueta: "Estimado", derecha: true },
            { clave: "montoReal", etiqueta: "Real", derecha: true },
            { clave: "diferencia", etiqueta: "Diferencia", derecha: true },
          ]}
        />
        <TablaDetalle
          titulo="Deudas"
          colorCabecera="bg-pink-100 text-pink-800"
          filas={filasDeudas}
          columnas={[
            { clave: "nombre", etiqueta: "Nombre" },
            { clave: "montoEstimado", etiqueta: "Estimado", derecha: true },
            { clave: "montoReal", etiqueta: "Real", derecha: true },
            { clave: "actual", etiqueta: "Actual", derecha: true },
          ]}
        />
      </div>
      <TablaDetalle
        titulo="Gastos fijos"
        colorCabecera="bg-pink-100 text-pink-800"
        filas={filasGastosFijos}
        columnas={[
          { clave: "nombre", etiqueta: "Gasto" },
          { clave: "montoEstimado", etiqueta: "Estimado", derecha: true },
          { clave: "montoReal", etiqueta: "Real", derecha: true },
          { clave: "diferencia", etiqueta: "Diferencia", derecha: true },
        ]}
      />
      <TablaDetalle
        titulo="Gastos variables"
        colorCabecera="bg-yellow-100 text-yellow-800"
        filas={filasGastosVariables}
        columnas={[
          { clave: "nombre", etiqueta: "Gasto" },
          { clave: "montoEstimado", etiqueta: "Estimado", derecha: true },
          { clave: "montoReal", etiqueta: "Real", derecha: true },
          { clave: "diferencia", etiqueta: "Diferencia", derecha: true },
        ]}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-2 font-semibold text-sm bg-gray-100 text-gray-700 text-center">
          Tracker de Gastos (Transacciones)
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="px-4 py-1">Categoría</th>
              <th className="px-4 py-1 text-right">Cantidad</th>
              <th className="px-4 py-1">Fecha</th>
              <th className="px-4 py-1">Notas</th>
            </tr>
          </thead>
          <tbody>
            {transacciones.map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-1">{t.categoria.nombre}</td>
                <td className="px-4 py-1 text-right">{fmt(t.monto)}</td>
                <td className="px-4 py-1">{fmtFecha(t.fecha)}</td>
                <td className="px-4 py-1">
                  <input
                    type="text"
                    defaultValue={t.notas || ""}
                    placeholder="Agregar nota..."
                    onBlur={(e) => handleGuardarNotaTransaccion(t.id, e.target.value)}
                    className="w-full border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-2 py-1 text-gray-600"
                  />
                </td>
              </tr>
            ))}
            {transacciones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-gray-400">Sin transacciones este mes</td>
              </tr>
            )}
          </tbody>
        </table>
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
        <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Presupuesto vs Real</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dataBarras}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Bar dataKey="Presupuesto" fill="#c4b5fd" />
            <Bar dataKey="Real" fill="#a855f7" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Distribución (presupuestado)</h2>
          {dataDonaPresupuesto.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">Sin presupuesto este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataDonaPresupuesto} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {dataDonaPresupuesto.map((d) => (
                    <Cell key={d.name} fill={COLORES_DISTRIBUCION[d.name] || "#a855f7"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Distribución (real)</h2>
          {dataDonaReal.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">Sin gastos registrados este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataDonaReal} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {dataDonaReal.map((d) => (
                    <Cell key={d.name} fill={COLORES_DISTRIBUCION[d.name] || "#a855f7"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
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
          Ahorraste ${resumen.ahorros.real.toFixed(2)} de ${resumen.ahorros.estimado.toFixed(2)} planificados (
          {progresoAhorro}%)
        </p>
      </div>
    </div>
  );
}
