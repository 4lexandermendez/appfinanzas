import { useEffect, useState } from "react";
import DonutConTotal from "../components/DonutConTotal";
import GraficaEstimadoReal from "../components/GraficaEstimadoReal";
import { obtenerResumenMes } from "../api/dashboard";
import { listarIngresos } from "../api/ingresos";
import { listarAhorros } from "../api/ahorros";
import { listarGastosFijosMensual } from "../api/gastosFijos";
import { listarDeudasMensual } from "../api/deudas";
import { listarTransacciones, actualizarTransaccion } from "../api/transacciones";
import { listarNotas, guardarNota, crearNota, eliminarNota } from "../api/presupuestoMensual";
import { obtenerDetalleQuincenal, listarTracker } from "../api/tracker";
import { listarDiasLibres } from "../api/diasLibres";
import { hoyISO, hoyAnioMes } from "../utils/fecha";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const CONCEPTOS_TRACKER = [
  { valor: "PASAJE_IDA", etiqueta: "Pasaje ida" },
  { valor: "DESAYUNO", etiqueta: "Desayuno" },
  { valor: "ALMUERZO", etiqueta: "Almuerzo" },
  { valor: "PASAJE_REGRESO", etiqueta: "Pasaje regreso" },
];

function diasEnElMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function diaSemanaUTC(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0=Dom..6=Sáb
}

// Semanas de Lunes a Sábado (el Domingo no se muestra, igual que en el Excel
// original y que Ajustes del Tracker, que solo distingue entre semana/sábado).
function construirSemanas(anio, mes) {
  const totalDias = diasEnElMes(anio, mes);
  const semanas = [];
  let semanaActual = Array(6).fill(null);
  for (let dia = 1; dia <= totalDias; dia++) {
    const dow = diaSemanaUTC(anio, mes, dia);
    if (dow === 0) continue;
    semanaActual[dow - 1] = dia;
    if (dow === 6) {
      semanas.push(semanaActual);
      semanaActual = Array(6).fill(null);
    }
  }
  if (semanaActual.some((d) => d !== null)) semanas.push(semanaActual);
  return semanas;
}

function CalendarioSemanal({ anio, mes, registrosTracker, diasLibres }) {
  const semanas = construirSemanas(anio, mes);
  const hoyStr = hoyISO();
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const totalPorDia = new Map();
  const registrosPorDia = new Map();
  for (const r of registrosTracker) {
    const dia = Number(r.fecha.slice(8, 10));
    totalPorDia.set(dia, (totalPorDia.get(dia) || 0) + Number(r.monto));
    if (!registrosPorDia.has(dia)) registrosPorDia.set(dia, []);
    registrosPorDia.get(dia).push(r);
  }
  const librePorDia = new Map();
  for (const d of diasLibres) {
    librePorDia.set(Number(d.fecha.slice(8, 10)), d.motivo);
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-2 font-semibold text-sm bg-gray-100 text-gray-700 text-center rounded-t-lg">
        Calendario semanal (Lunes a Sábado)
      </div>
      <table className="w-full text-sm text-center">
        <thead className="text-gray-500">
          <tr>
            {DIAS_SEMANA.map((d) => (
              <th key={d} className="px-2 py-2 font-medium">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i} className="border-t border-gray-100">
              {semana.map((dia, col) => {
                if (dia === null) return <td key={col} className="px-2 py-2" />;
                const fechaISO = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const esHoy = fechaISO === hoyStr;
                const motivo = librePorDia.get(dia);
                const total = totalPorDia.get(dia);
                const abierto = diaSeleccionado === dia;
                const registrosDia = registrosPorDia.get(dia) || [];
                return (
                  <td key={col} className="px-1 py-1 align-top relative">
                    <button
                      type="button"
                      onClick={() => !motivo && setDiaSeleccionado(abierto ? null : dia)}
                      className={`w-full rounded px-1 py-1 ${motivo ? "bg-gray-50 cursor-default" : "hover:bg-purple-50"} ${abierto ? "bg-purple-50 ring-1 ring-purple-300" : ""}`}
                    >
                      <div className={`text-xs ${esHoy ? "font-bold text-purple-700" : "text-gray-500"}`}>{dia}</div>
                      {motivo ? (
                        <div className="text-[10px] text-gray-400 mt-1">{motivo}</div>
                      ) : (
                        <div className="text-xs text-gray-700 mt-1">{fmt(total || 0)}</div>
                      )}
                    </button>

                    {abierto && !motivo && (
                      <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-left">
                        {CONCEPTOS_TRACKER.map((c) => {
                          const monto = registrosDia
                            .filter((r) => r.concepto === c.valor)
                            .reduce((s, r) => s + Number(r.monto), 0);
                          return (
                            <div key={c.valor} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-gray-500">{c.etiqueta}</span>
                              <span className="text-gray-800 font-medium">{fmt(monto)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  const [{ anio, mes }, setPeriodo] = useState(hoyAnioMes());
  const [resumen, setResumen] = useState(null);
  const [ingresos, setIngresos] = useState([]);
  const [ahorros, setAhorros] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [notaActiva, setNotaActiva] = useState(0);
  const [notasGuardando, setNotasGuardando] = useState(false);
  const [agregandoNota, setAgregandoNota] = useState(false);
  const [quincenal, setQuincenal] = useState(null);
  const [registrosTracker, setRegistrosTracker] = useState([]);
  const [diasLibres, setDiasLibres] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // StrictMode (dev) monta este efecto dos veces; sin el guard de
    // "cancelado", la corrida vieja puede resolver despues de la nueva y
    // pisar estado que el usuario ya cambio en pantalla con la foto vieja
    // del servidor.
    let cancelado = false;
    setCargando(true);
    Promise.all([
      obtenerResumenMes(anio, mes),
      listarIngresos(anio, mes),
      listarAhorros(anio, mes),
      listarGastosFijosMensual(anio, mes),
      listarDeudasMensual(anio, mes),
      listarTransacciones(anio, mes),
      obtenerDetalleQuincenal(anio, mes).catch(() => null),
      listarTracker(anio, mes),
      listarDiasLibres(anio, mes),
    ]).then(([r, i, a, gf, d, t, q, rt, dl]) => {
      if (cancelado) return;
      setResumen(r);
      setIngresos(i);
      setAhorros(a);
      setGastosFijos(gf.gastosFijos);
      setDeudas(d);
      setTransacciones(t);
      setQuincenal(q);
      setRegistrosTracker(rt);
      setDiasLibres(dl);
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [anio, mes]);

  // Las notas se cargan aparte (no bloquean el resto de la pagina) porque
  // agregarlas al Promise.all de arriba sumaba una consulta mas a la espera
  // inicial y la pagina se sentia mas lenta para mostrar todo lo demas.
  useEffect(() => {
    let cancelado = false;
    listarNotas(anio, mes).then((n) => {
      if (cancelado) return;
      setNotas(n);
      setNotaActiva(0);
    });
    return () => {
      cancelado = true;
    };
  }, [anio, mes]);

  function handleCambiarNota(indice, contenido) {
    setNotas((prev) => prev.map((n, i) => (i === indice ? { ...n, contenido } : n)));
  }

  async function handleGuardarNotaActiva() {
    const hoja = notas[notaActiva];
    // Si todavia no se confirmo con el servidor (ver handleAgregarHojaNota
    // mas abajo, "orden" nace en null), no hay donde guardar todavia — se
    // guardara solo cuando el usuario vuelva a salir de esa pestaña.
    if (!hoja || hoja.orden == null) return;
    setNotasGuardando(true);
    const guardada = await guardarNota(anio, mes, hoja.orden, hoja.contenido);
    setNotas((prev) => prev.map((n, i) => (i === notaActiva ? guardada : n)));
    setNotasGuardando(false);
  }

  async function handleAgregarHojaNota() {
    // Solo una creacion a la vez: si se agregan dos pestañas seguidas antes
    // de que la primera termine de confirmarse con el servidor, las dos
    // peticiones pueden chocar y el servidor les asigna el numero de orden
    // en el orden en que de casualidad terminan (no en el que se pidieron),
    // mezclando el contenido de una pestaña con el numero de otra.
    if (agregandoNota) return;
    setAgregandoNota(true);
    // Cambia de pestaña al toque (optimista) en vez de esperar la ida y
    // vuelta al servidor — contra Railway eso tarda 2-3s, y sin esto el
    // click se sentia como que no hizo nada. Se confirma en segundo plano
    // y se reconcilia conservando lo que el usuario ya haya escrito
    // mientras tanto.
    const indiceNuevo = notas.length;
    setNotas((prev) => [...prev, { id: null, orden: null, contenido: "" }]);
    setNotaActiva(indiceNuevo);
    const nueva = await crearNota(anio, mes);
    let contenidoEscrito = "";
    setNotas((prev) =>
      prev.map((n, i) => {
        if (i !== indiceNuevo) return n;
        contenidoEscrito = n.contenido;
        return { ...nueva, contenido: n.contenido };
      })
    );
    // Mientras "orden" era null (antes de esta confirmacion), el guardado
    // automatico al salir del campo se saltaba (no habia donde guardar
    // todavia) — si el usuario ya alcanzo a escribir algo en ese lapso, se
    // guarda ahora que ya se sabe el orden real, para no perderlo.
    if (contenidoEscrito) {
      await guardarNota(anio, mes, nueva.orden, contenidoEscrito);
    }
    setAgregandoNota(false);
  }

  async function handleEliminarHojaNota(indice) {
    const hoja = notas[indice];
    if (!hoja?.id || notas.length <= 1) return;
    await eliminarNota(hoja.id);
    setNotas((prev) => prev.filter((_, i) => i !== indice));
    setNotaActiva((prev) => (prev >= indice ? Math.max(0, prev - 1) : prev));
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
  // Las categorias variables son una lista global reutilizable (a diferencia
  // de Gastos Fijos, que si tienen "una fila por mes"), asi que sin este
  // filtro cualquier categoria que el usuario alguna vez creo aparecia en
  // todos los meses aunque no tuviera nada puesto ese mes en particular.
  // Comida y Transporte quedan siempre porque su estimado sale del tracker
  // automatico, no de algo que se "agregue" mes a mes.
  const filasGastosVariables = resumen.gastosVariables.porCategoria
    .filter((c) => c.esDefault || c.estimado !== null || Number(c.real) > 0)
    .map((c) => ({
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
                  {sinUsarEstimado < 0 ? `-${fmt(Math.abs(sinUsarEstimado))}` : fmt(sinUsarEstimado)}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${sinUsarReal < 0 ? "text-red-600" : ""}`}>
                  {sinUsarReal < 0 ? `-${fmt(Math.abs(sinUsarReal))}` : fmt(sinUsarReal)}
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
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-700 mr-1">Notas</h2>
            {notas.map((n, i) => (
              <div key={n.id ?? `nueva-${i}`} className="flex items-stretch rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNotaActiva(i)}
                  className={`text-xs px-2 py-1 ${
                    i === notaActiva ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-purple-100"
                  }`}
                >
                  {i + 1}
                </button>
                {notas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleEliminarHojaNota(i)}
                    title="Eliminar esta hoja"
                    className={`text-xs px-1.5 ${
                      i === notaActiva
                        ? "bg-purple-600 text-purple-200 hover:text-white"
                        : "bg-gray-100 text-gray-400 hover:text-red-500"
                    }`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAgregarHojaNota}
              disabled={agregandoNota}
              title="Agregar otra hoja de notas"
              className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-600 hover:bg-purple-100 font-bold disabled:opacity-50"
            >
              +
            </button>
          </div>
          <textarea
            key={notas[notaActiva]?.id ?? notaActiva}
            value={notas[notaActiva]?.contenido ?? ""}
            onChange={(e) => handleCambiarNota(notaActiva, e.target.value)}
            onBlur={handleGuardarNotaActiva}
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

      <CalendarioSemanal anio={anio} mes={mes} registrosTracker={registrosTracker} diasLibres={diasLibres} />

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
        <GraficaEstimadoReal
          data={dataBarras}
          xKey="nombre"
          claveEstimado="Presupuesto"
          formato={fmt}
          altura={260}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Distribución (presupuestado)</h2>
          {dataDonaPresupuesto.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">Sin presupuesto este mes</p>
          ) : (
            <DonutConTotal
              data={dataDonaPresupuesto}
              total={dataDonaPresupuesto.reduce((s, d) => s + d.value, 0)}
            />
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 text-center">Distribución (real)</h2>
          {dataDonaReal.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">Sin gastos registrados este mes</p>
          ) : (
            <DonutConTotal
              data={dataDonaReal}
              total={dataDonaReal.reduce((s, d) => s + d.value, 0)}
            />
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
