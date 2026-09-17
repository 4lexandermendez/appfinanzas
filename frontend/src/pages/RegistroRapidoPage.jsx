import { useEffect, useMemo, useRef, useState } from "react";
import { Bus, Coffee, Utensils, Pencil, Volume2, VolumeX, Banknote, CreditCard, Landmark, Check } from "lucide-react";
import { activarAudio, tic, din } from "../utils/sonidos";
import { obtenerGastadoHoy, obtenerResumenMes, obtenerRealAlInicioMes } from "../api/dashboard";
import { listarBotonesRapidos } from "../api/botonesRapidos";
import { registrarTracker, listarTracker, eliminarTracker, obtenerEstimadoMes } from "../api/tracker";
import { listarCategorias, crearCategoria } from "../api/categorias";
import { listarEstimadoVariables } from "../api/categoriasVariablesMensual";
import { crearTransaccion } from "../api/transacciones";
import { listarGastosFijosMensual, guardarGastoFijoMensual } from "../api/gastosFijos";
import { listarDeudasMensual } from "../api/deudas";
import { listarTarjetas, obtenerResumenPago, obtenerPendienteApartar, apartarAhora } from "../api/tarjetas";
import { listarGruposCuenta } from "../api/gruposCuenta";
import { hoyISO } from "../utils/fecha";

const NUEVA_CATEGORIA = "__nueva__";

// Fila de "¿Cual pagaste?" (gasto fijo o categoria variable) con boton
// Pagar que la deja marcada como elegida.
function FilaGasto({ nombre, derecha, seleccionada, esFijo, onPagar }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
        seleccionada ? (esFijo ? "bg-pink-50 border-pink-400" : "bg-purple-50 border-purple-400") : "bg-gray-50 border-transparent"
      }`}
    >
      <span className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-800">{nombre}</span>
      {derecha && <span className="text-xs text-gray-500 tabular-nums">{derecha}</span>}
      <button
        type="button"
        onClick={onPagar}
        className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white ${
          esFijo ? "bg-pink-600" : "bg-purple-600"
        }`}
      >
        {seleccionada ? (
          <>
            <Check className="w-3 h-3" /> Elegido
          </>
        ) : (
          "Pagar"
        )}
      </button>
    </div>
  );
}

// Cuadrito con forma de tarjeta (efectivo, tarjeta de credito o cuenta):
// tocarlo ES pagar, no hay boton de registrar aparte.
function Tarjetita({ clase, nombre, tipo, montoTxt, sub, chip, ancha, deshabilitada, onClick }) {
  return (
    <button
      type="button"
      disabled={deshabilitada}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-3 text-left text-white bg-gradient-to-br shadow-md flex flex-col justify-between gap-2 active:scale-[0.97] transition-transform disabled:opacity-40 disabled:cursor-not-allowed ${clase} ${
        ancha ? "col-span-2 min-h-[84px]" : "min-h-[124px]"
      }`}
    >
      <span className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/15" />
      <span className="absolute right-4 top-6 w-11 h-11 rounded-full bg-white/10" />
      <span className="relative">
        <span className="block text-xs font-bold leading-tight line-clamp-2">{nombre}</span>
        <span className="block text-[9.5px] font-semibold uppercase tracking-wider opacity-75">{tipo}</span>
      </span>
      {chip && <span className="relative block w-6 h-4 rounded bg-gradient-to-br from-yellow-200 to-yellow-600 opacity-90" />}
      <span className="relative">
        <span className="block text-base font-bold tabular-nums">{montoTxt}</span>
        <span className="block text-[10px] opacity-80">{sub}</span>
      </span>
    </button>
  );
}

// Colores por banco para las tarjetitas. Las clases van completas en cada
// string (no armadas por partes) para que Tailwind las encuentre.
function colorPorBanco(nombre = "") {
  const n = nombre.toLowerCase();
  if (n.includes("mastercard")) return "from-indigo-950 to-violet-700";
  if (n.includes("cuscat")) return "from-indigo-600 to-purple-600";
  if (n.includes("credisim") || n.includes("siman")) return "from-red-700 to-red-500";
  if (n.includes("agr")) return "from-emerald-800 to-emerald-500";
  if (n.includes("bac")) return "from-red-700 to-orange-500";
  if (n.includes("multimoney")) return "from-cyan-700 to-cyan-500";
  return "from-slate-700 to-slate-500";
}

const CONCEPTOS = [
  { valor: "PASAJE_IDA", etiqueta: "Pasaje ida", Icono: Bus },
  { valor: "DESAYUNO", etiqueta: "Desayuno", Icono: Coffee },
  { valor: "ALMUERZO", etiqueta: "Almuerzo", Icono: Utensils },
  { valor: "PASAJE_REGRESO", etiqueta: "Pasaje regreso", Icono: Bus },
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

// Angulo grande a proposito: con pocos items (4-6) hay que separarlos mas
// que los dias para que los botones (52px) no se encimen entre si.
const GRADOS_POR_MONTO = 40;
const RADIO_RUEDA_MONTO = 78;
const SENSIBILIDAD_ARRASTRE_MONTO = GRADOS_POR_MONTO / 55;

// Mismo mecanismo de arrastre/rotacion que SelectorFechaRueda, pero para
// montos: a diferencia de las fechas (donde "seleccionar" solo cambia que
// dia se ve, sin efecto real), acá seleccionar SI registra un gasto de
// verdad — por eso soltar el arrastre solo reacomoda la ruedita (no
// registra nada), y unicamente el tap directo sobre un monto lo registra.
// La ultima parada es "Otro" (lapiz), que abre un campo para escribir un
// monto que no este guardado.
function SelectorMontoRueda({ montos, onSeleccionar, onOtro, deshabilitado, sonido }) {
  const opciones = useMemo(() => [...montos.map((m) => ({ tipo: "monto", valor: m })), { tipo: "otro" }], [montos]);
  const [angulo, setAngulo] = useState(0);
  const anguloRef = useRef(0);
  const arrastreRef = useRef(null);
  const ultimoIdxRef = useRef(0);
  const anguloMax = (opciones.length - 1) * GRADOS_POR_MONTO;

  useEffect(() => {
    anguloRef.current = 0;
    ultimoIdxRef.current = 0;
    setAngulo(0);
  }, [opciones.length]);

  function fijarAngulo(valor) {
    const limitado = Math.max(0, Math.min(anguloMax, valor));
    anguloRef.current = limitado;
    setAngulo(limitado);
    // Un tic cada vez que el frente de la rueda cruza a otra parada.
    const idx = Math.round(limitado / GRADOS_POR_MONTO);
    if (idx !== ultimoIdxRef.current) {
      ultimoIdxRef.current = idx;
      if (sonido) tic();
    }
  }
  // El tap se resuelve aca (en pointerup, si no hubo arrastre) y NO con
  // onClick en cada boton: al capturar el puntero para arrastrar, el
  // navegador de escritorio re-dirige el click al contenedor y el boton
  // nunca lo recibe (en el telefono el toque genera el click por otro
  // camino, por eso ahi si andaba).
  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const boton = e.target.closest?.("button[data-idx]");
    arrastreRef.current = {
      x: e.clientX,
      anguloInicial: anguloRef.current,
      idxTocado: boton ? Number(boton.dataset.idx) : null,
      movido: false,
    };
  }
  function handlePointerMove(e) {
    if (!arrastreRef.current) return;
    const dx = e.clientX - arrastreRef.current.x;
    if (Math.abs(dx) > 5) arrastreRef.current.movido = true;
    fijarAngulo(arrastreRef.current.anguloInicial - dx * SENSIBILIDAD_ARRASTRE_MONTO);
  }
  function handlePointerUp() {
    const arrastre = arrastreRef.current;
    if (!arrastre) return;
    arrastreRef.current = null;
    if (!arrastre.movido && arrastre.idxTocado !== null && !deshabilitado) {
      elegir(arrastre.idxTocado);
      return;
    }
    const idx = Math.max(0, Math.min(opciones.length - 1, Math.round(anguloRef.current / GRADOS_POR_MONTO)));
    fijarAngulo(idx * GRADOS_POR_MONTO);
  }
  function elegir(idx) {
    const op = opciones[idx];
    if (!op) return;
    fijarAngulo(idx * GRADOS_POR_MONTO);
    if (op.tipo === "otro") onOtro();
    else onSeleccionar(op.valor);
  }

  return (
    <div className="relative">
      <div
        className="relative isolate h-[60px] select-none touch-none cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {opciones.map((op, i) => {
          const anguloItem = i * GRADOS_POR_MONTO - angulo;
          const anguloAbs = Math.abs(anguloItem);
          if (anguloAbs > 95) return null;

          const rad = (anguloItem * Math.PI) / 180;
          const offsetX = Math.sin(rad) * RADIO_RUEDA_MONTO;
          const escalaX = Math.max(0.08, Math.cos(rad));
          const opacidad = Math.max(0, escalaX - 0.05);
          const alFrente = anguloAbs < GRADOS_POR_MONTO / 2;

          return (
            <button
              key={op.tipo === "otro" ? "otro" : op.valor}
              type="button"
              data-idx={i}
              disabled={deshabilitado}
              title={op.tipo === "otro" ? "Otro monto" : undefined}
              style={{
                transform: `translate(${offsetX - 26}px, -50%) scaleX(${escalaX})`,
                opacity: opacidad,
                filter: `brightness(${0.6 + 0.4 * escalaX})`,
                zIndex: Math.round(1000 - anguloAbs),
              }}
              className={`absolute left-1/2 top-1/2 flex items-center justify-center w-[52px] h-[42px] rounded-xl text-sm font-bold tabular-nums disabled:opacity-50 ${
                alFrente ? "bg-purple-600 text-white" : "text-gray-400"
              }`}
            >
              {op.tipo === "otro" ? <Pencil className="w-4 h-4" /> : `$${op.valor.toFixed(2)}`}
            </button>
          );
        })}
      </div>
      <div className="absolute left-1/2 bottom-0.5 w-1 h-1 rounded-full bg-purple-300 -translate-x-1/2" />
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
  const [pendienteApartar, setPendienteApartar] = useState([]);
  const [mostrarPendienteApartar, setMostrarPendienteApartar] = useState(false);
  const [apartandoId, setApartandoId] = useState(null);
  const [cuentaParaApartar, setCuentaParaApartar] = useState("");
  const [cuentaDestinoParaApartar, setCuentaDestinoParaApartar] = useState("");
  const [botones, setBotones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estimadoVariables, setEstimadoVariables] = useState([]);
  const [registrosMes, setRegistrosMes] = useState([]);
  const [estimadoDias, setEstimadoDias] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  // Cual concepto (PASAJE_IDA, DESAYUNO, ...) tiene la ruedita de montos
  // abierta ahorita mismo — null si todos estan colapsados a solo su icono.
  const [conceptoExpandido, setConceptoExpandido] = useState(null);
  // El campo "Otro" solo aparece al tocar la parada del lapiz en la rueda.
  const [mostrarOtro, setMostrarOtro] = useState(false);
  // Sonido de la rueda (tic al girar, din al elegir). Se recuerda en este
  // navegador; si el telefono esta en silencio no suena igual.
  const [sonido, setSonido] = useState(() => {
    try {
      return localStorage.getItem("botonesRapidosSonido") !== "0";
    } catch {
      return true;
    }
  });
  function toggleSonido() {
    setSonido((v) => {
      try {
        localStorage.setItem("botonesRapidosSonido", v ? "0" : "1");
      } catch {
        // sin storage, solo dura la sesion
      }
      return !v;
    });
  }

  // Un solo formulario para gasto variable y fijo (pestana tipoGasto): lo
  // que cambia es la lista de "cual pagaste", el resto (monto, externo,
  // con que pagaste) es el mismo.
  const [tipoGasto, setTipoGasto] = useState("variable");
  const [categoriaId, setCategoriaId] = useState("");
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [gastoFijoId, setGastoFijoId] = useState("");
  const [monto, setMonto] = useState("");
  const [aportesExternos, setAportesExternos] = useState([]);
  const [mostrarExterno, setMostrarExterno] = useState(false);
  const [enviandoForm, setEnviandoForm] = useState(false);
  const [montosLibres, setMontosLibres] = useState({});
  const [tarjetas, setTarjetas] = useState([]);
  // null = todavia no eligio con que pago (las tarjetitas no se muestran).
  const [fuentePago, setFuentePago] = useState(null);
  const [cuentaOrigenId, setCuentaOrigenId] = useState("");
  const [cuentaDestinoId, setCuentaDestinoId] = useState("");
  // Tarjeta tocada cuyo banco tiene varias cuentas y hay que elegir a cual
  // apartar antes de confirmar (solo si se puso "Apartar de").
  const [tarjetaPendienteDestino, setTarjetaPendienteDestino] = useState(null);
  const [todasLasCuentas, setTodasLasCuentas] = useState([]);
  // Cuentas marcadas como "Principal" en Cuentas (tipicamente BAC +
  // Efectivo) — son las que cuentan como plata real disponible, a
  // diferencia de cuentas de reserva/deuda de otra gente.
  const cuentasPrincipales = useMemo(() => todasLasCuentas.filter((c) => c.esPrincipal), [todasLasCuentas]);
  const saldoReal = useMemo(
    () => cuentasPrincipales.reduce((s, c) => s + Number(c.saldoActual), 0),
    [cuentasPrincipales]
  );

  const [gastosFijos, setGastosFijos] = useState([]);
  const [gastosFijosMesAnterior, setGastosFijosMesAnterior] = useState([]);

  // Cada seccion se carga por separado (en vez de un solo Promise.all) para
  // que la que llega primero se pueda pintar ya — antes, si una tardaba mas
  // (ej. gastos fijos, que resuelve vigencia/sugerencias), toda la pantalla
  // se quedaba en blanco esperandola, incluidos los botones rapidos que en
  // si son una consulta simple y rapida.
  async function cargarGastadoDia() {
    const totales = await obtenerGastadoHoy(fechaSeleccionada);
    setGastadoDia(totales.totalHoy);
  }
  // Saldo disponible del mes: arranca de la plata real que ya habia en las
  // cuentas Principal el dia 1 (no de cero), mas lo que entro de ingresos
  // reales menos todo lo que ya salio (ahorros, gastos fijos, gastos
  // variables, deudas). Asi, mientras no haya un apartado tardio de otro
  // mes o un prestamo de tarjeta sin reponer, termina coincidiendo con
  // Real — antes arrancaba de $0 cada mes y nunca coincidia con nada.
  async function cargarSaldoDisponible() {
    const { anio, mes } = anioMes(fechaSeleccionada);
    const [resumen, realInicio] = await Promise.all([
      obtenerResumenMes(anio, mes),
      obtenerRealAlInicioMes(anio, mes),
    ]);
    const gastado =
      resumen.ahorros.real + resumen.gastosFijos.real + resumen.gastosVariables.real + resumen.deudas.real;
    setSaldoDisponible((realInicio || 0) + resumen.ingresos.real - gastado);
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
  async function cargarPendienteApartar() {
    setPendienteApartar(await obtenerPendienteApartar());
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
    cargarPendienteApartar();
    listarGruposCuenta().then((grupos) => {
      setTodasLasCuentas(grupos.flatMap((g) => g.cuentas.map((c) => ({ ...c, grupoId: g.id, grupoNombre: g.nombre }))));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApartarAhora(item) {
    if (!cuentaParaApartar) return;
    try {
      await apartarAhora({
        transaccionId: item.transaccionId || undefined,
        gastoFijoMensualId: item.gastoFijoMensualId || undefined,
        cuentaOrigenId: Number(cuentaParaApartar),
        cuentaDestinoId: cuentaDestinoParaApartar ? Number(cuentaDestinoParaApartar) : undefined,
      });
      setApartandoId(null);
      setCuentaParaApartar("");
      setCuentaDestinoParaApartar("");
      cargarPendienteApartar();
      const grupos = await listarGruposCuenta();
      setTodasLasCuentas(grupos.flatMap((g) => g.cuentas.map((c) => ({ ...c, grupoId: g.id, grupoNombre: g.nombre }))));
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo apartar la plata");
    }
  }

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

  const gastosFijosPagados = useMemo(() => gastosFijos.filter((g) => !faltaPagar(g)), [gastosFijos]);
  const estimadoPorCategoria = useMemo(
    () => new Map(estimadoVariables.map((e) => [e.categoriaId, e])),
    [estimadoVariables]
  );
  const cuentaEfectivo = useMemo(() => todasLasCuentas.find((c) => c.esEfectivo) || null, [todasLasCuentas]);
  const nombreSeleccionado = useMemo(() => {
    if (tipoGasto === "fijo") {
      const g = gastosFijosDisponibles.find((x) => `${x.gastoFijoConfigId}|${x._anio}|${x._mes}` === gastoFijoId);
      return g ? g.nombre : "";
    }
    if (categoriaId === NUEVA_CATEGORIA) return nuevaCategoriaNombre.trim() || "categoría nueva";
    const cat = categorias.find((c) => String(c.id) === String(categoriaId));
    return cat ? cat.nombre : "";
  }, [tipoGasto, gastosFijosDisponibles, gastoFijoId, categoriaId, nuevaCategoriaNombre, categorias]);

  function limpiarFormulario() {
    setCategoriaId("");
    setNuevaCategoriaNombre("");
    setGastoFijoId("");
    setMonto("");
    setAportesExternos([]);
    setMostrarExterno(false);
    setFuentePago(null);
    setCuentaOrigenId("");
    setCuentaDestinoId("");
    setTarjetaPendienteDestino(null);
  }

  function refrescarCuentas() {
    listarGruposCuenta().then((grupos) => {
      setTodasLasCuentas(grupos.flatMap((g) => g.cuentas.map((c) => ({ ...c, grupoId: g.id, grupoNombre: g.nombre }))));
    });
  }

  // Se llama al tocar una tarjetita (efectivo, una tarjeta o una cuenta):
  // valida lo elegido arriba y registra de una vez, sin boton aparte.
  async function pagarCon({ fuente, tarjetaId, cuentaBancariaId }) {
    setMensaje("");
    const esFijo = tipoGasto === "fijo";
    const esNueva = categoriaId === NUEVA_CATEGORIA;
    if (esFijo ? !gastoFijoId : !categoriaId || (esNueva && !nuevaCategoriaNombre.trim())) {
      setMensaje(
        esFijo ? "Elegí primero cuál gasto fijo pagaste" : esNueva ? "Escribí el nombre de la categoría nueva" : "Elegí primero cuál pagaste"
      );
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setMensaje("Poné el monto");
      return;
    }
    const sumaExternos = aportesExternos.reduce((s, a) => s + (Number(a) || 0), 0);
    if (sumaExternos > Number(monto)) {
      setMensaje("Lo externo no puede ser más que el monto total");
      return;
    }
    if (fuente === "TARJETA" && cuentaOrigenId) {
      const tarjetaSel = tarjetas.find((t) => t.id === tarjetaId);
      const cuentasDelBanco = todasLasCuentas.filter((c) => c.grupoId === tarjetaSel?.grupoId);
      if (cuentasDelBanco.length > 1 && !cuentaDestinoId) {
        setTarjetaPendienteDestino(tarjetaId);
        return;
      }
    }

    setEnviandoForm(true);
    try {
      const comun = {
        fuente,
        tarjetaId: fuente === "TARJETA" ? tarjetaId : undefined,
        cuentaBancariaId: fuente === "CUENTA_BANCO" ? cuentaBancariaId : undefined,
        aportesExternos: aportesExternos.filter((a) => a !== "").map(Number),
        cuentaOrigenId: fuente === "TARJETA" && cuentaOrigenId ? Number(cuentaOrigenId) : undefined,
        cuentaDestinoId: fuente === "TARJETA" && cuentaDestinoId ? Number(cuentaDestinoId) : undefined,
      };
      if (esFijo) {
        const [gastoFijoConfigId, anio, mes] = gastoFijoId.split("|").map(Number);
        await guardarGastoFijoMensual({ gastoFijoConfigId, anio, mes, montoReal: Number(monto), ...comun });
        setMensaje("Gasto fijo marcado como pagado");
      } else {
        const idFinal = esNueva ? (await crearCategoria(nuevaCategoriaNombre.trim())).id : Number(categoriaId);
        await crearTransaccion({ categoriaId: idFinal, monto: Number(monto), fecha: fechaSeleccionada, ...comun });
        setMensaje("Gasto registrado");
      }
      limpiarFormulario();
      cargarTodo();
      if (fuente === "TARJETA") {
        cargarPagosPendientesTarjetas();
        cargarPendienteApartar();
      }
      refrescarCuentas();
    } catch (err) {
      setMensaje(err.response?.data?.error || "No se pudo registrar");
    } finally {
      setEnviandoForm(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative bg-white rounded-lg shadow p-6 text-center">
        {saldoDisponible !== null && (
          <div className="absolute top-2 right-3 text-right">
            <div
              className={`text-xs font-semibold ${saldoDisponible < 0 ? "text-red-600" : "text-green-600"}`}
              title="Tu plata real del día 1 del mes, más ingresos, menos gastos/ahorros/deudas — se pone en rojo si te quedaste sin plata antes de tu próximo ingreso. Debería quedar cerca de Real; si se aleja, es por un apartado tardío o un préstamo de tarjeta sin reponer."
            >
              Saldo {saldoDisponible < 0 ? "-" : ""}${Math.abs(saldoDisponible).toFixed(2)}
            </div>
            {cuentasPrincipales.length > 0 && (
              <div
                className="text-[10px] text-gray-400"
                title={`Real: lo que de verdad hay ahorita en ${cuentasPrincipales.map((c) => c.nombre).join(" + ")} (marcadas como "Principal" en Cuentas). Es la cifra que siempre manda si hay diferencia con el Saldo de arriba.`}
              >
                Real ${saldoReal.toFixed(2)}
              </div>
            )}
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
        {pendienteApartar.length > 0 && (
          <div className="absolute top-12 right-3 text-left">
            <button
              onClick={() => setMostrarPendienteApartar((v) => !v)}
              className="text-xs font-semibold text-amber-600 hover:underline"
              title="Gastos con tarjeta a los que todavía no le apartaste la plata"
            >
              Por apartar ${pendienteApartar.reduce((s, p) => s + p.monto, 0).toFixed(2)}
            </button>
            {mostrarPendienteApartar && (
              <div className="mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 w-64 max-h-72 overflow-y-auto space-y-2 z-20 relative">
                {pendienteApartar.map((item) => {
                  const key = item.transaccionId ? `t${item.transaccionId}` : `g${item.gastoFijoMensualId}`;
                  const tarjeta = tarjetas.find((t) => t.id === item.tarjetaId);
                  const cuentasDelBanco = todasLasCuentas.filter((c) => c.grupoId === tarjeta?.grupoId);
                  return (
                    <div key={key} className="text-xs border-b border-gray-100 pb-2 last:border-0">
                      <div className="flex justify-between text-gray-700">
                        <span>{item.descripcion} ({item.tarjetaNombre})</span>
                        <span className="font-semibold">${item.monto.toFixed(2)}</span>
                      </div>
                      {apartandoId === key ? (
                        <div className="mt-1 flex flex-col gap-1">
                          <select
                            value={cuentaParaApartar}
                            onChange={(e) => setCuentaParaApartar(e.target.value)}
                            className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                          >
                            <option value="">-- De dónde --</option>
                            {todasLasCuentas.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.esEfectivo ? "💵 " : ""}{c.nombre} ({c.grupoNombre})
                              </option>
                            ))}
                          </select>
                          {cuentaParaApartar && cuentasDelBanco.length > 1 && (
                            <select
                              value={cuentaDestinoParaApartar}
                              onChange={(e) => setCuentaDestinoParaApartar(e.target.value)}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                            >
                              <option value="">-- ¿A cuál cuenta? --</option>
                              {cuentasDelBanco.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => handleApartarAhora(item)} className="text-purple-600 font-medium hover:underline">
                              Confirmar
                            </button>
                            <button
                              onClick={() => { setApartandoId(null); setCuentaParaApartar(""); setCuentaDestinoParaApartar(""); }}
                              className="text-gray-400 hover:underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setApartandoId(key)} className="text-purple-600 hover:underline mt-0.5">
                          Apartar ahora
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Botones rápidos</h2>
          <button
            type="button"
            onClick={toggleSonido}
            title={sonido ? "Silenciar la rueda" : "Activar sonido de la rueda"}
            aria-label={sonido ? "Silenciar la rueda" : "Activar sonido de la rueda"}
            className="text-gray-400 hover:text-gray-600"
          >
            {sonido ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-around">
          {CONCEPTOS.map((c) => {
            const activo = conceptoExpandido === c.valor;
            return (
              <button
                key={c.valor}
                type="button"
                title={c.etiqueta}
                aria-label={c.etiqueta}
                onClick={() => {
                  activarAudio();
                  setMostrarOtro(false);
                  setConceptoExpandido(activo ? null : c.valor);
                }}
                className={`flex items-center justify-center w-14 h-14 rounded-xl transition-colors active:scale-95 ${
                  activo ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <c.Icono className="w-6 h-6" />
              </button>
            );
          })}
        </div>

        {conceptoExpandido &&
          (() => {
            const c = CONCEPTOS.find((x) => x.valor === conceptoExpandido);
            const montosGuardados = botones
              .filter((b) => b.concepto === conceptoExpandido)
              .map((b) => Number(b.monto))
              .sort((a, b) => a - b);
            const opciones = [0, ...montosGuardados];
            const registrosConcepto = registrosDelConcepto(conceptoExpandido);
            const valorLibre = montosLibres[conceptoExpandido] ?? "";

            function cerrar() {
              setMostrarOtro(false);
              setConceptoExpandido(null);
            }
            async function handleSeleccionRueda(m) {
              if (sonido) din();
              await handleBoton(conceptoExpandido, m);
              cerrar();
            }
            async function handleOkLibre() {
              if (valorLibre === "") return;
              if (sonido) din();
              await handleMontoLibre(conceptoExpandido);
              cerrar();
            }

            return (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-1 text-center">{c.etiqueta}</p>
                <SelectorMontoRueda
                  montos={opciones}
                  onSeleccionar={handleSeleccionRueda}
                  onOtro={() => setMostrarOtro(true)}
                  deshabilitado={!!registrando}
                  sonido={sonido}
                />
                {mostrarOtro && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monto"
                      autoFocus
                      value={valorLibre}
                      onChange={(e) => setMontosLibres((prev) => ({ ...prev, [conceptoExpandido]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleOkLibre()}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleOkLibre}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
                    >
                      OK
                    </button>
                  </div>
                )}

                {registrosConcepto.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                    {registrosConcepto.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-2">
                        <span className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700">
                          ${Number(r.monto).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarTracker(r.id)}
                          title="Corregir / borrar"
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 text-xs"
                        >
                          🗑️
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {[
            ["variable", "Variable"],
            ["fijo", "Fijo"],
          ].map(([v, et]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setTipoGasto(v);
                limpiarFormulario();
              }}
              className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                tipoGasto === v ? (v === "fijo" ? "bg-white text-pink-600 shadow-sm" : "bg-white text-purple-700 shadow-sm") : "text-gray-500"
              }`}
            >
              {et}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
            {tipoGasto === "fijo" ? "Gastos fijos" : "Categorías"}
          </h3>
          <span className="text-[11px] text-gray-400">
            {tipoGasto === "fijo"
              ? `${gastosFijosDisponibles.length} por pagar · ${gastosFijosPagados.length} pagados`
              : `${categoriasDisponibles.length} este mes`}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 mb-5">
          {tipoGasto === "fijo" ? (
            <>
              {gastosFijosDisponibles.map((g) => {
                const key = `${g.gastoFijoConfigId}|${g._anio}|${g._mes}`;
                return (
                  <FilaGasto
                    key={key}
                    nombre={`${g.nombre}${g._mesAnterior ? " — mes anterior" : ""}`}
                    derecha={`$${Number(g.montoEstimado).toFixed(2)}`}
                    seleccionada={gastoFijoId === key}
                    esFijo
                    onPagar={() => {
                      setGastoFijoId(key);
                      setMonto(Number(g.montoEstimado).toFixed(2));
                    }}
                  />
                );
              })}
              {gastosFijosPagados.map((g) => (
                <div key={g.gastoFijoConfigId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 opacity-50">
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-700">{g.nombre}</span>
                  <span className="text-xs text-gray-500 tabular-nums">${Number(g.montoReal).toFixed(2)}</span>
                  <span className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
              {gastosFijosDisponibles.length === 0 && gastosFijos.length === 0 && (
                <p className="text-xs text-gray-400">No hay gastos fijos vigentes este mes. Agregalos en Presupuesto.</p>
              )}
            </>
          ) : (
            <>
              {categoriasDisponibles.map((cat) => {
                const info = estimadoPorCategoria.get(cat.id);
                return (
                  <FilaGasto
                    key={cat.id}
                    nombre={cat.nombre}
                    derecha={info?.montoEstimado != null ? `hasta $${Number(info.montoEstimado).toFixed(2)}` : ""}
                    seleccionada={String(categoriaId) === String(cat.id)}
                    onPagar={() => {
                      setCategoriaId(String(cat.id));
                      setNuevaCategoriaNombre("");
                    }}
                  />
                );
              })}
              {categoriaId === NUEVA_CATEGORIA ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-400 bg-purple-50">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nombre de la categoría nueva"
                    value={nuevaCategoriaNombre}
                    onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaId("");
                      setNuevaCategoriaNombre("");
                    }}
                    className="text-gray-400 text-sm"
                    title="Cancelar"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCategoriaId(NUEVA_CATEGORIA)}
                  className="text-left px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500"
                >
                  + Imprevisto (categoría nueva)
                </button>
              )}
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[11.5px] font-semibold text-gray-500 mb-1.5">
            {tipoGasto === "fijo" ? "Monto pagado" : "Monto"}
            {nombreSeleccionado && (
              <>
                {" · "}
                <b className="text-gray-800">{nombreSeleccionado}</b>
              </>
            )}
          </label>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3.5">
            <span className="text-xl font-bold text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-2xl font-bold py-2.5 outline-none tabular-nums"
            />
          </div>
          {!mostrarExterno ? (
            <button
              type="button"
              onClick={() => {
                setMostrarExterno(true);
                setAportesExternos([""]);
              }}
              className="mt-2 text-xs font-bold text-purple-600"
            >
              + Alguien más puso plata
            </button>
          ) : (
            <div className="mt-2">
              <AportesExternos aportes={aportesExternos} onChange={setAportesExternos} />
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11.5px] font-semibold text-gray-500 mb-1.5">Pagaste con</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["EFECTIVO", "Efectivo", Banknote],
              ["TARJETA", "Tarjeta", CreditCard],
              ["CUENTA_BANCO", "Cuenta", Landmark],
            ].map(([k, et, Icono]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setFuentePago(fuentePago === k ? null : k);
                  setTarjetaPendienteDestino(null);
                }}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11.5px] font-semibold ${
                  fuentePago === k ? "bg-purple-50 border-purple-500 text-purple-800" : "border-gray-200 text-gray-500"
                }`}
              >
                <Icono className="w-5 h-5" />
                {et}
              </button>
            ))}
          </div>

          {fuentePago === "TARJETA" && (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-500">
              <span className="shrink-0">Apartar de</span>
              <select
                value={cuentaOrigenId}
                onChange={(e) => {
                  setCuentaOrigenId(e.target.value);
                  setCuentaDestinoId("");
                  setTarjetaPendienteDestino(null);
                }}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="">nada (opcional)</option>
                {todasLasCuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.esEfectivo ? "💵 " : ""}
                    {c.nombre} ({c.grupoNombre}) · ${Number(c.saldoActual).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {fuentePago && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-3">
              {fuentePago === "EFECTIVO" && (
                <Tarjetita
                  ancha
                  clase="from-green-600 to-teal-700"
                  nombre="Efectivo"
                  tipo={cuentaEfectivo ? "Billetera" : "Sin billetera configurada"}
                  montoTxt={cuentaEfectivo ? `$${Number(cuentaEfectivo.saldoActual).toFixed(2)}` : ""}
                  sub={cuentaEfectivo ? "disponible ahora" : "se registra igual"}
                  deshabilitada={enviandoForm || (cuentaEfectivo && Number(monto) > Number(cuentaEfectivo.saldoActual))}
                  onClick={() => pagarCon({ fuente: "EFECTIVO" })}
                />
              )}
              {fuentePago === "TARJETA" &&
                tarjetas.map((t) => {
                  const disponible = Number(t.info?.disponible ?? Number(t.limite) - Number(t.saldoActual));
                  return (
                    <Tarjetita
                      key={t.id}
                      chip
                      clase={colorPorBanco(t.nombre)}
                      nombre={t.nombre}
                      tipo="Crédito"
                      montoTxt={`$${Number(t.saldoActual).toFixed(2)}`}
                      sub={`disponible $${disponible.toFixed(2)}`}
                      deshabilitada={enviandoForm || Number(monto) > disponible}
                      onClick={() => pagarCon({ fuente: "TARJETA", tarjetaId: t.id })}
                    />
                  );
                })}
              {fuentePago === "CUENTA_BANCO" &&
                todasLasCuentas
                  .filter((c) => !c.esEfectivo)
                  .map((c) => (
                    <Tarjetita
                      key={c.id}
                      clase={colorPorBanco(`${c.grupoNombre} ${c.nombre}`)}
                      nombre={c.nombre}
                      tipo={c.grupoNombre}
                      montoTxt={`$${Number(c.saldoActual).toFixed(2)}`}
                      sub="saldo actual"
                      deshabilitada={enviandoForm || Number(monto) > Number(c.saldoActual)}
                      onClick={() => pagarCon({ fuente: "CUENTA_BANCO", cuentaBancariaId: c.id })}
                    />
                  ))}
            </div>
          )}

          {tarjetaPendienteDestino &&
            (() => {
              const tarjetaSel = tarjetas.find((t) => t.id === tarjetaPendienteDestino);
              const cuentasDelBanco = todasLasCuentas.filter((c) => c.grupoId === tarjetaSel?.grupoId);
              return (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span>¿A cuál cuenta de {tarjetaSel?.nombre.split(" ")[0]} apartar?</span>
                  <select
                    value={cuentaDestinoId}
                    onChange={(e) => setCuentaDestinoId(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                  >
                    <option value="">-- Elegir --</option>
                    {cuentasDelBanco.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!cuentaDestinoId || enviandoForm}
                    onClick={() => pagarCon({ fuente: "TARJETA", tarjetaId: tarjetaPendienteDestino })}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                </div>
              );
            })()}

          {fuentePago && (
            <p className="text-[11.5px] text-gray-400 text-center mt-2.5">
              {enviandoForm
                ? "Registrando..."
                : fuentePago === "EFECTIVO"
                  ? "Tocá para pagar con efectivo"
                  : fuentePago === "TARJETA"
                    ? "Tocá la tarjeta con la que pagaste"
                    : "Tocá la cuenta de la que salió"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
