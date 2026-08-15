import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { obtenerGastadoHoy, obtenerResumenMes } from "../api/dashboard";
import { listarBotonesRapidos } from "../api/botonesRapidos";
import { registrarTracker, listarTracker, eliminarTracker, obtenerEstimadoMes } from "../api/tracker";
import { listarCategorias, crearCategoria } from "../api/categorias";
import { listarEstimadoVariables } from "../api/categoriasVariablesMensual";
import { crearTransaccion } from "../api/transacciones";
import { listarGastosFijosMensual, guardarGastoFijoMensual } from "../api/gastosFijos";
import { listarDeudasMensual } from "../api/deudas";
import { listarTarjetas, obtenerResumenPago } from "../api/tarjetas";
import { hoyISO } from "../utils/fecha";

const NUEVA_CATEGORIA = "__nueva__";

const CUENTAS_BANCO = [
  { valor: "CUSCATLAN", etiqueta: "Cuenta de ahorro Cuscatlán" },
  { valor: "MULTIMONEY", etiqueta: "Cuenta de ahorro Multimoney" },
  { valor: "BAC", etiqueta: "Cuenta de ahorro BAC" },
  { valor: "AGRICOLA_PRINCIPAL", etiqueta: "Cuenta de ahorro Agrícola (principal)" },
  { valor: "AGRICOLA_SECUNDARIA", etiqueta: "Cuenta de ahorro Agrícola (secundaria)" },
];

const CONCEPTOS = [
  { valor: "PASAJE_IDA", etiqueta: "Pasaje ida" },
  { valor: "DESAYUNO", etiqueta: "Desayuno" },
  { valor: "ALMUERZO", etiqueta: "Almuerzo" },
  { valor: "PASAJE_REGRESO", etiqueta: "Pasaje regreso" },
];

const NOMBRES_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Iconos simples (no son el logo real, solo una forma que se distinga a
// simple vista) para el aviso de pago pendiente de tarjeta.
function IconoAgricola({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="2" y="4.5" width="20" height="3" rx="1.5" fill="#009845" />
      <rect x="2" y="10.5" width="20" height="3" rx="1.5" fill="#009845" />
      <rect x="2" y="16.5" width="20" height="3" rx="1.5" fill="#009845" />
    </svg>
  );
}
function IconoCuscatlan({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" fill="#EE1C25" />
    </svg>
  );
}
function IconoSiman({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="#7A1943" transform="rotate(45 12 12)" />
    </svg>
  );
}
function iconoParaTarjeta(nombre) {
  const n = (nombre || "").toUpperCase();
  if (n.includes("AGRICOLA") || n.includes("AGRÍCOLA")) return IconoAgricola;
  if (n.includes("CUSCA") || n.includes("CUSCATLAN") || n.includes("CUSCATLÁN")) return IconoCuscatlan;
  if (n.includes("SIMAN")) return IconoSiman;
  return null;
}

function diaDelMes(fechaISO) {
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDate();
}

function diaSemana(fechaISO) {
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDay();
}

function anioMes(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

function formatoFechaLarga(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  return d.toLocaleDateString("es", { day: "numeric", month: "long", timeZone: "UTC" });
}

// Gastos fijos que se pagan con tarjeta a veces se marcan como pagados hasta
// que corta el ciclo (ej. el 10 del mes siguiente), ya entrado el mes nuevo.
// Durante esos primeros dias el selector tambien ofrece los gastos fijos del
// mes anterior que quedaron sin marcar, para no tener que ir a Presupuesto a
// registrarlos — igual siguen contando para el mes al que en verdad
// pertenecen, no para el mes actual.
const DIAS_GRACIA_MES_ANTERIOR = 10;

function mesAnterior(anio, mes) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

// Lista de "aportes externos" (plata que puso otra persona para cubrir
// parte de este gasto, ej. el cine dividido entre varios) — el monto
// principal del formulario sigue siendo el total cobrado de verdad; esto
// solo se resta despues contra el presupuesto. El "+" agrega una fila mas
// por cada persona que aporto.
function AportesExternos({ aportes, onChange }) {
  function agregar() {
    onChange([...aportes, ""]);
  }
  function actualizar(i, valor) {
    onChange(aportes.map((a, idx) => (idx === i ? valor : a)));
  }
  function quitar(i) {
    onChange(aportes.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Externo (plata de otra persona, opcional)</span>
        <button type="button" onClick={agregar} className="text-xs text-purple-600 hover:underline font-bold">
          + agregar
        </button>
      </div>
      {aportes.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={a}
            onChange={(e) => actualizar(i, e.target.value)}
            placeholder="Monto externo"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button type="button" onClick={() => quitar(i)} className="text-red-500 hover:text-red-700 text-sm" title="Quitar">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const GRADOS_POR_ITEM = 15; // cuanto "gira" el anillo por cada dia
const RADIO_RUEDA = 125; // px — separacion horizontal maxima del centro
const SENSIBILIDAD_ARRASTRE = GRADOS_POR_ITEM / 42; // px arrastrados -> grados

// Selector de fecha tipo anillo/cilindro giratorio: se arrastra de
// izquierda a derecha (nunca arriba/abajo), el dia al frente se ve grande
// y nitido, y los que se alejan se van curvando de canto hasta esconderse
// — no es un desvanecido plano, es la curvatura de un tubo.
//
// Ojo: la primera version usaba transform 3D real (perspective + rotateY +
// preserve-3d), pero eso renderizaba mal (texto/fondo duplicado, tipo
// fantasma) en al menos una laptop real — es un problema conocido de
// compositing 3D en Chrome/Windows con ciertos GPU o escalas de pantalla.
// Se reemplazo por la MISMA curva pero calculada a mano en 2D puro (seno
// para la posicion horizontal, coseno para el achicado/foreshortening que
// simula el giro), sin perspective/rotateY/preserve-3d — mismo efecto
// visual, sin depender de compositing 3D que puede fallar.
function SelectorFechaRueda({ dias, fechaSeleccionada, onSeleccionar, hoyReal, tipoPorDia, diasConRegistro }) {
  const indiceInicial = Math.max(0, dias.indexOf(fechaSeleccionada));
  const anguloMax = (dias.length - 1) * GRADOS_POR_ITEM;
  const [angulo, setAngulo] = useState(indiceInicial * GRADOS_POR_ITEM);
  const anguloRef = useRef(angulo);
  const arrastreRef = useRef(null); // { x, anguloInicial } | null

  // Si la fecha seleccionada cambia desde afuera (click directo en un
  // dia), el anillo se re-centra en esa fecha.
  useEffect(() => {
    const nuevo = Math.max(0, dias.indexOf(fechaSeleccionada)) * GRADOS_POR_ITEM;
    anguloRef.current = nuevo;
    setAngulo(nuevo);
  }, [fechaSeleccionada, dias]);

  function fijarAngulo(valor) {
    const limitado = Math.max(0, Math.min(anguloMax, valor));
    anguloRef.current = limitado;
    setAngulo(limitado);
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = { x: e.clientX, anguloInicial: anguloRef.current };
  }
  function handlePointerMove(e) {
    if (!arrastreRef.current) return;
    // Arrastrar a la izquierda gira el anillo hacia fechas mas adelante,
    // igual que un scroll horizontal normal.
    const dx = e.clientX - arrastreRef.current.x;
    fijarAngulo(arrastreRef.current.anguloInicial - dx * SENSIBILIDAD_ARRASTRE);
  }
  function handlePointerUp() {
    if (!arrastreRef.current) return;
    arrastreRef.current = null;
    const idx = Math.max(0, Math.min(dias.length - 1, Math.round(anguloRef.current / GRADOS_POR_ITEM)));
    fijarAngulo(idx * GRADOS_POR_ITEM);
    if (dias[idx] !== fechaSeleccionada) onSeleccionar(dias[idx]);
  }

  function handleClickDia(fecha, idx) {
    fijarAngulo(idx * GRADOS_POR_ITEM);
    onSeleccionar(fecha);
  }

  return (
    <div
      // isolate: los z-index altos de cada dia (hasta 1000, para que el
      // frente tape a los que se van curvando de canto) son solo para
      // ordenarse ENTRE ELLOS. Sin isolate, esos numeros se comparan contra
      // TODA la pagina y se salian por encima del menu lateral movil
      // (z-40/z-50) — con isolate quedan encerrados aca adentro.
      className="relative isolate h-16 mt-4 select-none touch-none cursor-grab active:cursor-grabbing overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {dias.map((f, i) => {
        const anguloItem = i * GRADOS_POR_ITEM - angulo;
        const anguloAbs = Math.abs(anguloItem);
        if (anguloAbs > 90) return null; // ya esta de canto, no hace falta pintarlo

        const seleccionado = f === fechaSeleccionada;
        const esHoy = f === hoyReal;
        const dow = diaSemana(f);
        const tipo = tipoPorDia.get(f);
        const finDeSemanaSinDatos = tipo
          ? tipo === "DOMINGO" || tipo === "SABADO_NO_TOCA" || tipo === "LIBRE"
          : (dow === 0 || dow === 6) && !diasConRegistro.has(f);

        // Proyeccion de un punto girando en circulo, vista de frente: la
        // posicion horizontal sigue un seno y el achicado (foreshortening
        // de un objeto que se va de canto) sigue un coseno — es la misma
        // curva que daria una rotacion 3D real, calculada a mano.
        const rad = (anguloItem * Math.PI) / 180;
        const offsetX = Math.sin(rad) * RADIO_RUEDA;
        const escalaX = Math.max(0.06, Math.cos(rad));
        const opacidad = Math.max(0, escalaX - 0.06);

        return (
          <button
            key={f}
            type="button"
            onClick={() => handleClickDia(f, i)}
            style={{
              transform: `translate(${offsetX - 24}px, -50%) scaleX(${escalaX})`,
              opacity: opacidad,
              filter: `brightness(${0.55 + 0.45 * escalaX})`,
              zIndex: Math.round(1000 - anguloAbs),
            }}
            // Solo el dia seleccionado (al frente) lleva caja de fondo solido
            // — los demas son texto sin fondo, para que al superponerse (son
            // muchos dias angostos muy juntos) no choquen visualmente dos
            // cajas opacas entre si, solo texto atenuado sobre texto.
            className={`absolute left-1/2 top-1/2 flex flex-col items-center justify-center w-12 h-14 rounded-lg text-xs ${
              seleccionado
                ? "bg-purple-600 text-white"
                : finDeSemanaSinDatos
                  ? "text-gray-300"
                  : "text-gray-600"
            } ${esHoy && !seleccionado ? "ring-1 ring-purple-400" : ""}`}
          >
            <span>{NOMBRES_DIA[dow]}</span>
            <span className="font-semibold text-sm">{diaDelMes(f)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function RegistroRapidoPage() {
  const hoyReal = useMemo(() => hoyISO(), []);
  // Todo el mes (1 al 28/29/30/31, segun corresponda) para poder registrar
  // gastos de dias pasados que se te hayan olvidado, no solo ±3 dias.
  const ventanaDias = useMemo(() => {
    const { anio, mes } = anioMes(hoyReal);
    const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const dias = [];
    for (let dia = 1; dia <= ultimoDia; dia++) {
      dias.push(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`);
    }
    return dias;
  }, [hoyReal]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyReal);
  const [gastadoDia, setGastadoDia] = useState(null);
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [deudaTotalPendiente, setDeudaTotalPendiente] = useState(null);
  const [pagosPendientesTarjetas, setPagosPendientesTarjetas] = useState([]);
  const [botones, setBotones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estimadoVariables, setEstimadoVariables] = useState([]);
  const [registrosMes, setRegistrosMes] = useState([]);
  const [estimadoDias, setEstimadoDias] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const [categoriaId, setCategoriaId] = useState(null);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [aportesExternos, setAportesExternos] = useState([]);
  const [enviandoForm, setEnviandoForm] = useState(false);
  const [montosLibres, setMontosLibres] = useState({});
  const [tarjetas, setTarjetas] = useState([]);
  const [fuentePago, setFuentePago] = useState("EFECTIVO");
  const [tarjetaId, setTarjetaId] = useState("");
  const [cuenta, setCuenta] = useState("");

  const [gastosFijos, setGastosFijos] = useState([]);
  const [gastosFijosMesAnterior, setGastosFijosMesAnterior] = useState([]);
  const [gastoFijoId, setGastoFijoId] = useState("");
  const [montoFijo, setMontoFijo] = useState("");
  const [aportesExternosFijo, setAportesExternosFijo] = useState([]);
  const [enviandoFijo, setEnviandoFijo] = useState(false);
  const [fuentePagoFijo, setFuentePagoFijo] = useState("EFECTIVO");
  const [tarjetaIdFijo, setTarjetaIdFijo] = useState("");
  const [cuentaFijo, setCuentaFijo] = useState("");

  // Cada seccion se carga por separado (en vez de un solo Promise.all) para
  // que la que llega primero se pueda pintar ya — antes, si una tardaba mas
  // (ej. gastos fijos, que resuelve vigencia/sugerencias), toda la pantalla
  // se quedaba en blanco esperandola, incluidos los botones rapidos que en
  // si son una consulta simple y rapida.
  async function cargarGastadoDia() {
    const totales = await obtenerGastadoHoy(fechaSeleccionada);
    setGastadoDia(totales.totalHoy);
  }
  // Saldo disponible del mes: lo mismo que "Sin usar (Real)" en Mes — lo
  // que ya entró de ingresos reales menos todo lo que ya salio (ahorros,
  // gastos fijos, gastos variables, deudas). Sirve para ver de un vistazo
  // si ya te quedaste sin plata de la quincena (queda en rojo/negativo)
  // antes de que entre el proximo ingreso.
  async function cargarSaldoDisponible() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const resumen = await obtenerResumenMes(anio, mes);
    const gastado =
      resumen.ahorros.real + resumen.gastosFijos.real + resumen.gastosVariables.real + resumen.deudas.real;
    setSaldoDisponible(resumen.ingresos.real - gastado);
  }
  async function cargarBotones() {
    setBotones(await listarBotonesRapidos());
  }
  // Saldo pendiente de deudas (lo que aun debes, no lo pagado este mes) —
  // se muestra aparte del saldo disponible porque ese solo resta el Real ya
  // pagado, no el total pendiente.
  async function cargarDeudaTotalPendiente() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const deudas = await listarDeudasMensual(anio, mes);
    setDeudaTotalPendiente(deudas.reduce((s, d) => s + Number(d.actual || 0), 0));
  }
  // Cuanto hay que pagar del ciclo ya cortado de cada tarjeta y en cuantos
  // dias — solo aparece si ese ciclo ya cerro (no mientras se sigue
  // llenando el ciclo nuevo) y desaparece solo en cuanto se paga.
  async function cargarPagosPendientesTarjetas() {
    setPagosPendientesTarjetas(await obtenerResumenPago());
  }
  async function cargarCategorias() {
    setCategorias(await listarCategorias());
  }
  async function cargarEstimadoVariables() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    setEstimadoVariables(await listarEstimadoVariables(anio, mes));
  }
  async function cargarTracker() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    setRegistrosMes(await listarTracker(anio, mes));
  }
  // Para saber si un sabado realmente "toca" (segun el patron alterno de
  // Ajustes) en vez de adivinarlo por si ya tiene datos registrados o no —
  // un sabado futuro que si toca no debe verse bloqueado solo porque
  // todavia no se le registra nada.
  async function cargarEstimadoDias() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    try {
      const data = await obtenerEstimadoMes(anio, mes);
      setEstimadoDias(data.dias);
    } catch {
      setEstimadoDias(null);
    }
  }
  async function cargarGastosFijos() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const data = await listarGastosFijosMensual(anio, mes);
    setGastosFijos(data.gastosFijos);
  }
  async function cargarGastosFijosMesAnterior() {
    const dia = diaDelMes(hoyReal);
    if (dia > DIAS_GRACIA_MES_ANTERIOR) {
      setGastosFijosMesAnterior([]);
      return;
    }
    const actual = anioMes(hoyReal);
    const { anio, mes } = mesAnterior(actual.anio, actual.mes);
    const data = await listarGastosFijosMensual(anio, mes);
    setGastosFijosMesAnterior(data.gastosFijos);
  }
  async function cargarTarjetas() {
    setTarjetas(await listarTarjetas());
  }

  function cargarTodo() {
    cargarGastadoDia();
    cargarSaldoDisponible();
    cargarBotones();
    cargarCategorias();
    cargarDeudaTotalPendiente();
    cargarEstimadoVariables();
    cargarTracker();
    cargarEstimadoDias();
    cargarGastosFijos();
    cargarGastosFijosMesAnterior();
    cargarTarjetas();
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada]);

  // Independiente de la fecha seleccionada (no cambia al girar la rueda),
  // asi que se carga aparte una sola vez al entrar.
  useEffect(() => {
    cargarPagosPendientesTarjetas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diasConRegistro = useMemo(
    () => new Set(registrosMes.map((r) => r.fecha.slice(0, 10))),
    [registrosMes]
  );
  const tipoPorDia = useMemo(
    () => new Map((estimadoDias || []).map((d) => [d.fecha, d.tipo])),
    [estimadoDias]
  );

  // Un gasto fijo ya pagado en su totalidad este mes (real >= estimado) deja
  // de mostrarse en el selector — no hay nada más que pagar ahí. Si solo se
  // pagó una parte (real < estimado), se sigue mostrando hasta completarlo.
  function faltaPagar(g) {
    return !(g.montoReal !== null && Number(g.montoReal) >= Number(g.montoEstimado));
  }

  const gastosFijosDisponibles = useMemo(() => {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const actuales = gastosFijos.filter(faltaPagar).map((g) => ({ ...g, _anio: anio, _mes: mes, _mesAnterior: false }));
    const anterior = mesAnterior(anio, mes);
    const pendientesAnterior = gastosFijosMesAnterior
      .filter(faltaPagar)
      .map((g) => ({ ...g, _anio: anterior.anio, _mes: anterior.mes, _mesAnterior: true }));
    return [...actuales, ...pendientesAnterior];
  }, [gastosFijos, gastosFijosMesAnterior, fechaSeleccionada]);

  // Igual que con gastos fijos: una categoría variable ya pagada en su
  // totalidad este mes (real >= estimado) deja de mostrarse en el selector.
  // Transporte y Comida quedan afuera de este filtro porque su "estimado"
  // es el presupuesto automático del tracker (Ajustes), no algo que uno
  // "complete" y termine — casi siempre queda saldo sin gastar ahí.
  const categoriasDisponibles = useMemo(() => {
    const estimadoPorCategoria = new Map(estimadoVariables.map((e) => [e.categoriaId, e]));
    return categorias.filter((cat) => {
      const info = estimadoPorCategoria.get(cat.id);
      if (!info) return false;
      if (info.esDefault) return true;
      // Las categorias variables son una lista global reutilizable: una
      // categoria de otro mes (sin estimado puesto ni nada real este mes)
      // no "pertenece" a este mes y no debe aparecer en el selector.
      const perteneceAlMes = info.montoEstimado !== null || Number(info.montoReal) > 0;
      if (!perteneceAlMes) return false;
      if (info.montoEstimado === null) return true;
      return !(Number(info.montoReal) >= Number(info.montoEstimado));
    });
  }, [categorias, estimadoVariables]);

  function registrosDelConcepto(concepto) {
    return registrosMes
      .filter((r) => r.fecha.slice(0, 10) === fechaSeleccionada && r.concepto === concepto)
      .sort((a, b) => a.id - b.id);
  }

  async function handleBoton(concepto, montoBoton) {
    setRegistrando(`${concepto}-${montoBoton}`);
    setMensaje("");
    try {
      await registrarTracker({ fecha: fechaSeleccionada, concepto, monto: montoBoton });
      cargarTodo();
      setMensaje(`Registrado: $${montoBoton.toFixed(2)}`);
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar");
    } finally {
      setRegistrando(null);
    }
  }

  async function handleEliminarTracker(id) {
    await eliminarTracker(id);
    cargarTodo();
  }

  async function handleMontoLibre(concepto) {
    const valor = montosLibres[concepto];
    if (valor === undefined || valor === "") return;
    await handleBoton(concepto, Number(valor));
    setMontosLibres((prev) => ({ ...prev, [concepto]: "" }));
  }

  async function handleSubmitGasto(e) {
    e.preventDefault();
    setMensaje("");
    const esNueva = categoriaId === NUEVA_CATEGORIA;
    if (!categoriaId || (esNueva && !nuevaCategoriaNombre.trim())) {
      setMensaje(esNueva ? "Escribí el nombre de la categoría nueva" : "Elige una categoría");
      return;
    }
    if (fuentePago === "TARJETA" && !tarjetaId) {
      setMensaje("Elige con qué tarjeta pagaste");
      return;
    }
    if (fuentePago === "CUENTA_BANCO" && !cuenta) {
      setMensaje("Elige de cuál cuenta pagaste");
      return;
    }
    const sumaExternos = aportesExternos.reduce((s, a) => s + (Number(a) || 0), 0);
    if (sumaExternos > Number(monto)) {
      setMensaje("Lo externo no puede ser más que el monto total");
      return;
    }
    setEnviandoForm(true);
    try {
      const idFinal = esNueva ? (await crearCategoria(nuevaCategoriaNombre.trim())).id : Number(categoriaId);
      await crearTransaccion({
        categoriaId: idFinal,
        monto: Number(monto),
        fecha: fechaSeleccionada,
        fuente: fuentePago,
        tarjetaId: fuentePago === "TARJETA" ? Number(tarjetaId) : undefined,
        cuenta: fuentePago === "CUENTA_BANCO" ? cuenta : undefined,
        aportesExternos: aportesExternos.filter((a) => a !== "").map(Number),
      });
      setMonto("");
      setAportesExternos([]);
      setCategoriaId("");
      setNuevaCategoriaNombre("");
      setFuentePago("EFECTIVO");
      setTarjetaId("");
      setCuenta("");
      cargarTodo();
      if (fuentePago === "TARJETA") cargarPagosPendientesTarjetas();
      const totales = await obtenerGastadoHoy(fechaSeleccionada);
      setGastadoDia(totales.totalHoy);
      setMensaje("Gasto registrado");
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar el gasto");
    } finally {
      setEnviandoForm(false);
    }
  }

  async function handleSubmitGastoFijo(e) {
    e.preventDefault();
    setMensaje("");
    if (!gastoFijoId || !montoFijo) {
      setMensaje("Elige un gasto fijo y su monto");
      return;
    }
    if (fuentePagoFijo === "TARJETA" && !tarjetaIdFijo) {
      setMensaje("Elige con qué tarjeta pagaste");
      return;
    }
    if (fuentePagoFijo === "CUENTA_BANCO" && !cuentaFijo) {
      setMensaje("Elige de cuál cuenta pagaste");
      return;
    }
    const sumaExternosFijo = aportesExternosFijo.reduce((s, a) => s + (Number(a) || 0), 0);
    if (sumaExternosFijo > Number(montoFijo)) {
      setMensaje("Lo externo no puede ser más que el monto total");
      return;
    }
    setEnviandoFijo(true);
    try {
      const [gastoFijoConfigId, anio, mes] = gastoFijoId.split("|").map(Number);
      await guardarGastoFijoMensual({
        gastoFijoConfigId,
        anio,
        mes,
        montoReal: Number(montoFijo),
        fuente: fuentePagoFijo,
        tarjetaId: fuentePagoFijo === "TARJETA" ? Number(tarjetaIdFijo) : undefined,
        cuenta: fuentePagoFijo === "CUENTA_BANCO" ? cuentaFijo : undefined,
        aportesExternos: aportesExternosFijo.filter((a) => a !== "").map(Number),
      });
      setGastoFijoId("");
      setMontoFijo("");
      setAportesExternosFijo([]);
      setFuentePagoFijo("EFECTIVO");
      setTarjetaIdFijo("");
      setCuentaFijo("");
      if (fuentePagoFijo === "TARJETA") cargarPagosPendientesTarjetas();
      setMensaje("Gasto fijo marcado como pagado");
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar el gasto fijo");
    } finally {
      setEnviandoFijo(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative bg-white rounded-lg shadow p-6 text-center">
        {saldoDisponible !== null && (
          <div
            className={`absolute top-2 right-3 text-xs font-semibold ${
              saldoDisponible < 0 ? "text-red-600" : "text-green-600"
            }`}
            title="Ingresos reales del mes menos lo que ya gastaste/ahorraste/debés — se pone en rojo si te quedaste sin plata antes de tu próximo ingreso"
          >
            Saldo {saldoDisponible < 0 ? "-" : ""}${Math.abs(saldoDisponible).toFixed(2)}
          </div>
        )}
        {deudaTotalPendiente !== null && deudaTotalPendiente > 0 && (
          <div
            className="absolute top-7 right-3 text-xs font-semibold text-yellow-600"
            title="Total que aún debés (saldo pendiente de todas tus deudas activas)"
          >
            Debés ${deudaTotalPendiente.toFixed(2)}
          </div>
        )}
        {pagosPendientesTarjetas.length > 0 && (
          <div className="absolute top-2 left-3 text-left space-y-1">
            {pagosPendientesTarjetas.map((p) => {
              const Icono = iconoParaTarjeta(p.nombre);
              return (
                <div
                  key={p.tarjetaId}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600"
                  title={`${p.nombre} — ciclo ya cortado, vence el ${p.fechaPago}`}
                >
                  {Icono ? <Icono /> : <span>{p.nombre}:</span>}
                  <span>
                    ${p.monto.toFixed(2)} en {p.diasParaPago}d
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-sm text-gray-500">
          {fechaSeleccionada === hoyReal ? "Hoy llevas gastado" : `Llevas gastado el ${formatoFechaLarga(fechaSeleccionada)}`}
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {gastadoDia === null ? "..." : `$${gastadoDia.toFixed(2)}`}
        </p>

        <SelectorFechaRueda
          dias={ventanaDias}
          fechaSeleccionada={fechaSeleccionada}
          onSeleccionar={setFechaSeleccionada}
          hoyReal={hoyReal}
          tipoPorDia={tipoPorDia}
          diasConRegistro={diasConRegistro}
        />
      </div>

      {mensaje && (
        <p className="text-sm text-center text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-2">
          {mensaje}
        </p>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="hidden sm:grid sm:grid-cols-2 gap-x-4 mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Botones rápidos</h2>
          <h2 className="text-sm font-semibold text-gray-700">Hoy registraste</h2>
        </div>
        <h2 className="sm:hidden text-sm font-semibold text-gray-700 mb-3">Botones rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          {CONCEPTOS.map((c) => {
            const config = botones.find((b) => b.concepto === c.valor);
            const montos = config ? [config.monto1, config.monto2, config.monto3].filter(Boolean) : [];
            const registrosConcepto = registrosDelConcepto(c.valor);
            return (
              <Fragment key={c.valor}>
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-500 mb-1">{c.etiqueta}</p>
                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    <button
                      type="button"
                      disabled={registrando === `${c.valor}-0`}
                      onClick={() => handleBoton(c.valor, 0)}
                      className="shrink-0 px-3 py-2 rounded bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      $0.00
                    </button>
                    {montos.map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={registrando === `${c.valor}-${m}`}
                        onClick={() => handleBoton(c.valor, Number(m))}
                        className="shrink-0 px-3 py-2 rounded bg-purple-100 text-purple-800 text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                      >
                        ${Number(m).toFixed(2)}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Otro"
                        value={montosLibres[c.valor] ?? ""}
                        onChange={(e) => setMontosLibres((prev) => ({ ...prev, [c.valor]: e.target.value }))}
                        className="w-16 shrink-0 border border-gray-300 rounded px-2 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleMontoLibre(c.valor)}
                        className="shrink-0 px-2 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-1 sm:border-t sm:border-gray-50 sm:pt-3">
                  <p className="text-xs text-gray-500 mb-1 sm:invisible">Hoy registraste</p>
                  {registrosConcepto.length === 0 ? (
                    <div className="inline-flex items-center px-3 py-2 rounded border border-dashed border-gray-200 text-xs text-gray-300">
                      Sin registros
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {registrosConcepto.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-2">
                          <span className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">
                            ${Number(r.monto).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEliminarTracker(r.id)}
                            title="Corregir / borrar"
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500"
                          >
                            🗑️
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmitGasto} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Gasto variable</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">¿Cuál pagaste?</label>
            <select
              value={categoriaId ?? ""}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Elegir categoría --</option>
              {categoriasDisponibles.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
              <option value={NUEVA_CATEGORIA}>+ Imprevisto (categoría nueva)</option>
            </select>
            {categoriaId === NUEVA_CATEGORIA && (
              <input
                type="text"
                placeholder="Nombre de la categoría (ej. Emergencia carro)"
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Monto</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <AportesExternos aportes={aportesExternos} onChange={setAportesExternos} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Pagaste con</label>
            <select
              value={fuentePago}
              onChange={(e) => setFuentePago(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta de crédito</option>
              <option value="CUENTA_BANCO">Cuenta de banco</option>
            </select>
            {fuentePago === "TARJETA" && (
              <select
                value={tarjetaId}
                onChange={(e) => setTarjetaId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              >
                <option value="">-- Elegir tarjeta --</option>
                {tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            )}
            {fuentePago === "CUENTA_BANCO" && (
              <select
                value={cuenta}
                onChange={(e) => setCuenta(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              >
                <option value="">-- Elegir cuenta --</option>
                {CUENTAS_BANCO.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={enviandoForm}
            className="w-full bg-purple-600 text-white rounded py-2 font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {enviandoForm ? "Registrando..." : "Marcar como pagado"}
          </button>
        </form>

        <form onSubmit={handleSubmitGastoFijo} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Gasto fijo (ya pagado)</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">¿Cuál pagaste?</label>
            <select
              value={gastoFijoId}
              onChange={(e) => setGastoFijoId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Elegir gasto fijo --</option>
              {gastosFijosDisponibles.map((g) => (
                <option key={`${g.gastoFijoConfigId}-${g._anio}-${g._mes}`} value={`${g.gastoFijoConfigId}|${g._anio}|${g._mes}`}>
                  {g.nombre} (est. ${Number(g.montoEstimado).toFixed(2)}){g._mesAnterior ? " — mes anterior" : ""}
                </option>
              ))}
            </select>
            {gastosFijosDisponibles.length === 0 && gastosFijos.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No hay gastos fijos vigentes este mes. Agregalos en Presupuesto.
              </p>
            )}
            {gastosFijosDisponibles.length === 0 && gastosFijos.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">Ya pagaste todos los gastos fijos de este mes.</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Monto pagado</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoFijo}
              onChange={(e) => setMontoFijo(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <AportesExternos aportes={aportesExternosFijo} onChange={setAportesExternosFijo} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Pagaste con</label>
            <select
              value={fuentePagoFijo}
              onChange={(e) => setFuentePagoFijo(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta de crédito</option>
              <option value="CUENTA_BANCO">Cuenta de banco</option>
            </select>
            {fuentePagoFijo === "TARJETA" && (
              <select
                value={tarjetaIdFijo}
                onChange={(e) => setTarjetaIdFijo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              >
                <option value="">-- Elegir tarjeta --</option>
                {tarjetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            )}
            {fuentePagoFijo === "CUENTA_BANCO" && (
              <select
                value={cuentaFijo}
                onChange={(e) => setCuentaFijo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
              >
                <option value="">-- Elegir cuenta --</option>
                {CUENTAS_BANCO.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={enviandoFijo}
            className="w-full bg-pink-600 text-white rounded py-2 font-medium hover:bg-pink-700 disabled:opacity-50"
          >
            {enviandoFijo ? "Registrando..." : "Marcar como pagado"}
          </button>
        </form>
      </div>
    </div>
  );
}
