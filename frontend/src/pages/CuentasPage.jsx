import { useEffect, useState } from "react";
import {
  listarGruposCuenta, crearGrupoCuenta, eliminarGrupoCuenta, moverGrupoCuenta,
  crearCuentaBancaria, crearCuentaEfectivo,
} from "../api/gruposCuenta";
import {
  crearTarjeta, eliminarTarjeta, pagarTarjeta, abonarTarjeta,
  listarMovimientos, crearMovimiento, actualizarMovimiento, eliminarMovimiento,
} from "../api/tarjetas";
import {
  crearTarjetaDebito, eliminarTarjetaDebito,
  listarMovimientosCuenta, crearMovimientoCuenta, actualizarMovimientoCuenta, eliminarMovimientoCuenta,
  transferirEntreCuentas,
} from "../api/cuentasBancarias";
import { hoyISO } from "../utils/fecha";

function IconTrash({ className = "w-4 h-4" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function IconEye({ className = "w-4 h-4" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconTransfer({ className = "w-4 h-4" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 4v13" />
      <path d="M3 13l4 4 4-4" />
      <path d="M17 20V7" />
      <path d="M21 11l-4-4-4 4" />
    </svg>
  );
}

function IconPlus({ className = "w-5 h-5" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

const DIAS_SEMANA_DOM = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function construirSemanasCiclo(inicioISO, finISO) {
  const dias = [];
  let cursor = new Date(`${inicioISO}T00:00:00Z`);
  const fin = new Date(`${finISO}T00:00:00Z`);
  while (cursor <= fin) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86400000);
  }

  const semanas = [];
  let semana = Array(7).fill(null);
  let col = new Date(`${dias[0]}T00:00:00Z`).getUTCDay();
  for (const d of dias) {
    semana[col] = d;
    col++;
    if (col === 7) {
      semanas.push(semana);
      semana = Array(7).fill(null);
      col = 0;
    }
  }
  if (semana.some((x) => x !== null)) semanas.push(semana);
  return semanas;
}

function sumarDiaISO(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Calendario del ciclo de facturación. Si todavía hay saldo pendiente
// (hayDeuda), se muestra el ciclo ya vencido (el que hay que pagar, del día
// siguiente a su corte anterior hasta su propio pago) seguido del ciclo
// nuevo que ya se abrió para seguir gastando. Una vez pagado el saldo, el
// ciclo vencido desaparece y solo queda el nuevo.
function CalendarioCiclo({ ciclo, movimientos, hayDeuda }) {
  const inicio = hayDeuda ? ciclo.inicioCicloVencido : sumarDiaISO(ciclo.corteVencido, 1);
  const semanas = construirSemanasCiclo(inicio, ciclo.pagoProximo);

  const totalPorDia = new Map();
  for (const m of movimientos) {
    const fecha = m.fecha.slice(0, 10);
    totalPorDia.set(fecha, (totalPorDia.get(fecha) || 0) + Number(m.monto));
  }

  function estiloDia(fecha) {
    if (fecha === ciclo.corteVencido || fecha === ciclo.corteProximo) return "bg-orange-100 border border-orange-400";
    if (fecha === ciclo.pagoVencido || fecha === ciclo.pagoProximo) return "bg-blue-100 border border-blue-400";
    if (hayDeuda && fecha <= ciclo.corteVencido) return "bg-white";
    if (fecha <= ciclo.corteProximo) return "bg-purple-50";
    return "bg-green-50";
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center gap-4 text-xs mb-2 flex-wrap">
        {hayDeuda && (
          <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-white border border-gray-300" /> Ciclo por pagar</span>
        )}
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-purple-50 border border-purple-200" /> Ciclo nuevo (podés gastar)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-orange-100 border border-orange-400" /> Corte</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-blue-100 border border-blue-400" /> Pago</span>
      </div>
      <table className="w-full text-xs text-center border-collapse">
        <thead className="text-gray-400">
          <tr>
            {DIAS_SEMANA_DOM.map((d) => (
              <th key={d} className="px-1 py-1 font-medium">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i}>
              {semana.map((fecha, col) => {
                if (!fecha) return <td key={col} className="px-1 py-1" />;
                const dia = Number(fecha.slice(8, 10));
                const esInicioMes = dia === 1;
                const total = totalPorDia.get(fecha);
                return (
                  <td key={col} className={`px-1 py-1 align-top rounded ${estiloDia(fecha)}`}>
                    <div className="text-gray-600">
                      {dia}
                      {esInicioMes && <span className="text-gray-400"> {MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}</span>}
                    </div>
                    {(fecha === ciclo.corteVencido || fecha === ciclo.corteProximo) && (
                      <div className="text-[10px] text-orange-600 font-medium">Corte</div>
                    )}
                    {(fecha === ciclo.pagoVencido || fecha === ciclo.pagoProximo) && (
                      <div className="text-[10px] text-blue-600 font-medium">Pago</div>
                    )}
                    {total ? (
                      <div className={`text-[10px] mt-0.5 ${total < 0 ? "text-green-600" : "text-gray-700"}`}>
                        ${Math.abs(total).toFixed(2)}
                      </div>
                    ) : null}
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

function FormNuevaTarjetaCredito({ grupos, onSubmit }) {
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [limite, setLimite] = useState("");
  const [diaCorte, setDiaCorte] = useState("");
  const [diaPago, setDiaPago] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!grupoId || !nombre.trim() || !limite || !diaCorte || !diaPago) return;
    await onSubmit(Number(grupoId), {
      nombre: nombre.trim(), limite: Number(limite), diaCorte: Number(diaCorte), diaPago: Number(diaPago),
    });
  }

  if (grupos.length === 0) {
    return <p className="text-sm text-gray-400">Primero creá un grupo.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>{g.nombre}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Nombre (ej. Visa BAC)" value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm col-span-2" />
        <input type="number" step="0.01" placeholder="Límite" value={limite}
          onChange={(e) => setLimite(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm" />
        <div />
        <input type="number" min="1" max="31" placeholder="Día de corte" value={diaCorte}
          onChange={(e) => setDiaCorte(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm" />
        <input type="number" min="1" max="31" placeholder="Día de pago" value={diaPago}
          onChange={(e) => setDiaPago(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Crear tarjeta
      </button>
    </form>
  );
}

function MovimientoForm({ onSubmit }) {
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!monto) return;
    await onSubmit({ monto: Number(monto), fecha: hoyISO(), descripcion });
    setMonto(""); setDescripcion("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input type="number" step="0.01" placeholder="Monto (+compra / -pago)" value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-32 shrink-0 border border-gray-300 rounded px-2 py-1 text-sm" />
        <input type="text" placeholder="Descripción" value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" className="w-full bg-purple-100 text-purple-800 rounded px-3 py-1 text-sm hover:bg-purple-200">
        Agregar
      </button>
    </form>
  );
}

const GRADIENTES_TARJETA = [
  "from-purple-600 to-indigo-700",
  "from-teal-500 to-cyan-600",
  "from-fuchsia-600 to-pink-700",
  "from-blue-600 to-indigo-800",
];

function gradientePara(id) {
  return GRADIENTES_TARJETA[Number(id) % GRADIENTES_TARJETA.length];
}

// Visual tipo "wallet" (gradiente, esquinas redondeadas, chip decorativo) que
// encabeza tanto las tarjetas de credito como las de debito — estas ultimas
// no llevan monto porque el saldo real vive en la cuenta, no en la tarjeta.
function TarjetaVisual({ id, nombre, etiqueta, monto, detalle, onEliminar, eliminarTitulo }) {
  // Borrar una tarjeta es destructivo (se pierde todo su historial de
  // movimientos) — antes era un solo click, sin confirmar, lo cual causó
  // una pérdida de datos real por accidente. Ahora pide confirmar.
  const [confirmando, setConfirmando] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradientePara(id)} p-5 text-white`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute right-10 -bottom-10 w-24 h-24 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/70 font-medium truncate">{nombre}</p>
          {etiqueta && <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">{etiqueta}</p>}
          {monto !== undefined && <p className="text-2xl font-bold mt-2">{monto}</p>}
          {detalle && <p className="text-[11px] text-white/60 mt-0.5">{detalle}</p>}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="w-9 h-7 rounded-md bg-white/25" />
          {confirmando ? (
            <span className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <span className="text-white/70">¿Seguro?</span>
              <button onClick={onEliminar} className="text-white font-semibold hover:underline">Sí</button>
              <button onClick={() => setConfirmando(false)} className="text-white/70 hover:underline">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmando(true)} className="text-white/70 hover:text-white" title={eliminarTitulo}>
              <IconTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TarjetaCard({ tarjeta, todasLasCuentas, onEliminar, onRefrescar }) {
  const [expandida, setExpandida] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [cuentaOrigenId, setCuentaOrigenId] = useState("");

  async function cargarMovimientos() {
    setMovimientos(await listarMovimientos(tarjeta.id));
  }

  useEffect(() => {
    if (expandida || mostrarCalendario) cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida, mostrarCalendario]);

  async function handleNuevoMovimiento(datos) {
    await crearMovimiento(tarjeta.id, datos);
    await cargarMovimientos();
    onRefrescar();
  }
  async function handleEliminarMovimiento(id) {
    await eliminarMovimiento(tarjeta.id, id);
    await cargarMovimientos();
    onRefrescar();
  }
  // Solo un check visual (ej. "ya lo revisé") — no afecta ningun calculo,
  // por eso se actualiza el estado local sin recargar todo.
  async function handleToggleRevisado(id, revisado) {
    setMovimientos((prev) => prev.map((m) => (m.id === id ? { ...m, revisado } : m)));
    await actualizarMovimiento(tarjeta.id, id, revisado);
  }

  const [pagando, setPagando] = useState(false);
  async function handlePagar() {
    setPagando(true);
    try {
      await pagarTarjeta(tarjeta.id, cuentaOrigenId ? Number(cuentaOrigenId) : undefined);
      await cargarMovimientos();
      onRefrescar();
    } finally {
      setPagando(false);
    }
  }

  // Abono libre: a diferencia de "Pagar", no espera a que el ciclo corte —
  // sirve para ir bajando saldo antes, con cualquier monto.
  const [mostrarAbono, setMostrarAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState("");
  const [cuentaAbonoId, setCuentaAbonoId] = useState("");
  const [abonando, setAbonando] = useState(false);
  async function handleAbonar() {
    const monto = Number(montoAbono);
    if (!monto || monto <= 0) return;
    setAbonando(true);
    try {
      await abonarTarjeta(tarjeta.id, monto, cuentaAbonoId ? Number(cuentaAbonoId) : undefined);
      setMontoAbono("");
      setMostrarAbono(false);
      await cargarMovimientos();
      onRefrescar();
    } finally {
      setAbonando(false);
    }
  }

  const [verHistorialCompleto, setVerHistorialCompleto] = useState(false);

  const { info } = tarjeta;
  const corteUrgente = info.diasParaCorte <= 3;
  const pagoUrgente = info.diasParaPago <= 3;
  // Ojo: no es "saldoActual > 0" — eso incluiria compras del ciclo nuevo
  // que todavia no vencen. Esto es especificamente si el ciclo YA CORTADO
  // sigue con algo pendiente (lo unico que "Pagar saldo total" debe pagar,
  // y lo unico que el calendario de abajo debe marcar como "por pagar").
  const hayDeuda = info.montoCicloVencido > 0;

  // Una vez pagado TODO el ciclo (un movimiento "Pago total"), ese pago y
  // todo lo anterior ya no se muestran en la lista (no se borran, solo se
  // ocultan) — asi el historial visible arranca limpio con lo nuevo. No se
  // puede usar "saldoActual > 0" para decidir esto porque apenas se
  // registra una compra nueva el saldo vuelve a subir, aunque el ciclo
  // anterior ya este pagado. Se compara por id (orden real de creacion) en
  // vez de fecha, porque un pago y una compra nueva el mismo dia tendrian
  // la misma fecha pero deben poder distinguirse igual. "Ver historial
  // completo" trae todo de vuelta sin tener que borrar nada.
  // OJO: un "Abono" (pago parcial) NO cuenta aca — a diferencia de "Pago
  // total", un abono no necesariamente salda todo lo anterior, asi que no
  // debe esconder cargos que siguen pendientes.
  const idUltimoPago = movimientos
    .filter((m) => Number(m.monto) < 0 && m.descripcion === "Pago total")
    .reduce((max, m) => Math.max(max, m.id), 0);
  // Se calcula aparte de movimientosVisibles (que ya depende de
  // verHistorialCompleto) para que el boton de mostrar/ocultar no se
  // desaparezca a si mismo apenas se activa el toggle.
  const hayHistorialOculto = idUltimoPago > 0 && movimientos.some((m) => m.id <= idUltimoPago);
  const movimientosVisibles =
    verHistorialCompleto || !idUltimoPago
      ? movimientos
      : movimientos.filter((m) => m.id > idUltimoPago);

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <TarjetaVisual
        id={tarjeta.id}
        nombre={tarjeta.nombre}
        etiqueta="Tarjeta de crédito"
        monto={`$${Number(tarjeta.saldoActual).toFixed(2)}`}
        detalle={`de $${Number(tarjeta.limite).toFixed(2)} · disponible $${info.disponible.toFixed(2)}`}
        onEliminar={() => onEliminar(tarjeta.id)}
        eliminarTitulo="Eliminar tarjeta"
      />

      <div className="p-6">
        {hayDeuda && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handlePagar}
              disabled={pagando}
              title="Solo paga el ciclo ya cortado — lo que ya compraste en el ciclo nuevo no vence todavía"
              className="text-green-700 text-sm font-medium hover:underline disabled:opacity-50"
            >
              {pagando ? "Pagando..." : `Pagar $${info.montoCicloVencido.toFixed(2)} (ciclo cortado)`}
            </button>
            {todasLasCuentas.length > 0 && (
              <select
                value={cuentaOrigenId}
                onChange={(e) => setCuentaOrigenId(e.target.value)}
                title="De qué cuenta sale el dinero (opcional)"
                className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-600"
              >
                <option value="">Sin descontar de ninguna cuenta</option>
                {todasLasCuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.esEfectivo ? "💵 " : ""}{c.nombre} ({c.grupoNombre})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {Number(tarjeta.saldoActual) > 0 && (
          <div className="mb-3">
            {!mostrarAbono ? (
              <button
                onClick={() => setMostrarAbono(true)}
                title="Abonar cualquier monto ahora, sin esperar a que el ciclo corte"
                className="text-gray-600 text-sm font-medium hover:underline"
              >
                Abonar antes del corte
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={Number(tarjeta.saldoActual)}
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  placeholder="Monto"
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                  autoFocus
                />
                {todasLasCuentas.length > 0 && (
                  <select
                    value={cuentaAbonoId}
                    onChange={(e) => setCuentaAbonoId(e.target.value)}
                    title="De qué cuenta sale el dinero (opcional)"
                    className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-600"
                  >
                    <option value="">Sin descontar de ninguna cuenta</option>
                    {todasLasCuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.esEfectivo ? "💵 " : ""}{c.nombre} ({c.grupoNombre})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleAbonar}
                  disabled={abonando || !montoAbono}
                  className="text-green-700 text-sm font-medium hover:underline disabled:opacity-50"
                >
                  {abonando ? "Abonando..." : "Confirmar"}
                </button>
                <button
                  onClick={() => { setMostrarAbono(false); setMontoAbono(""); }}
                  className="text-gray-400 text-sm hover:underline"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className={`rounded px-3 py-2 ${corteUrgente ? "bg-yellow-50 text-yellow-800" : "bg-gray-50 text-gray-600"}`}>
            Corta en {info.diasParaCorte} día{info.diasParaCorte === 1 ? "" : "s"}
          </div>
          <div className={`rounded px-3 py-2 ${pagoUrgente ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
            Pagar en {info.diasParaPago} día{info.diasParaPago === 1 ? "" : "s"}
          </div>
          <div className="rounded px-3 py-2 bg-gray-50 text-gray-600">
            Pago mínimo: ${info.pagoMinimo.toFixed(2)}
          </div>
          <div className="rounded px-3 py-2 bg-gray-50 text-gray-600">
            Pago total (de contado): ${info.pagoTotal.toFixed(2)}
          </div>
        </div>

        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setExpandida((v) => !v)}
            className="text-purple-600 text-sm hover:underline flex items-center gap-1"
          >
            <IconEye />
            {expandida ? "Ocultar movimientos" : "Ver movimientos"}
          </button>
          <button
            onClick={() => setMostrarCalendario((v) => !v)}
            className="text-purple-600 text-sm hover:underline"
          >
            {mostrarCalendario ? "Ocultar calendario" : "Ver calendario del ciclo"}
          </button>
        </div>

        {mostrarCalendario && <CalendarioCiclo ciclo={info.ciclo} movimientos={movimientos} hayDeuda={hayDeuda} />}

        {expandida && (
          <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="space-y-1">
            {movimientosVisibles.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!m.revisado}
                  onChange={(e) => handleToggleRevisado(m.id, e.target.checked)}
                  title="Marcar (solo visual, no afecta nada)"
                  className="shrink-0"
                />
                <span className="text-gray-400 w-20 shrink-0">{m.fecha.slice(0, 10)}</span>
                <span className={`w-16 shrink-0 ${Number(m.monto) < 0 ? "text-green-600" : "text-gray-800"}`}>
                  ${Math.abs(Number(m.monto)).toFixed(2)}
                </span>
                <span className="flex-1 min-w-0 text-gray-500 break-words">{m.descripcion}</span>
                <button onClick={() => handleEliminarMovimiento(m.id)} className="text-red-500 hover:text-red-700 shrink-0" title="Eliminar movimiento">
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {movimientosVisibles.length === 0 && <p className="text-sm text-gray-400">Sin movimientos desde el último pago</p>}
          </div>
          {hayHistorialOculto && (
            <button
              onClick={() => setVerHistorialCompleto((v) => !v)}
              className="text-purple-600 text-xs mt-2 hover:underline"
            >
              {verHistorialCompleto ? "Ocultar ciclos ya pagados" : "Ver historial completo (ciclos ya pagados)"}
            </button>
          )}
          <MovimientoForm onSubmit={handleNuevoMovimiento} />
        </div>
        )}
      </div>
    </div>
  );
}

function FormNuevaCuenta({ grupos, onSubmit }) {
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? "");
  const [nombre, setNombre] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!grupoId || !nombre.trim()) return;
    await onSubmit(Number(grupoId), nombre.trim());
  }

  if (grupos.length === 0) {
    return <p className="text-sm text-gray-400">Primero creá un grupo.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>{g.nombre}</option>
        ))}
      </select>
      <input type="text" placeholder="Nombre de la cuenta" value={nombre}
        onChange={(e) => setNombre(e.target.value)} autoFocus
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Crear cuenta
      </button>
    </form>
  );
}

function FormNuevaTarjetaDebito({ cuentas, onSubmit }) {
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? "");
  const [nombre, setNombre] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cuentaId || !nombre.trim()) return;
    await onSubmit(Number(cuentaId), nombre.trim());
  }

  if (cuentas.length === 0) {
    return <p className="text-sm text-gray-400">Todas tus cuentas ya tienen tarjeta de débito, o primero creá una cuenta.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
        {cuentas.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre} ({c.grupoNombre})</option>
        ))}
      </select>
      <input type="text" placeholder="Nombre (ej. Débito Agrícola)" value={nombre}
        onChange={(e) => setNombre(e.target.value)} autoFocus
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Crear tarjeta de débito
      </button>
    </form>
  );
}

function TransferenciaForm({ cuentasDestino, onSubmit, onCancelar }) {
  const [cuentaDestinoId, setCuentaDestinoId] = useState(cuentasDestino[0]?.id ?? "");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cuentaDestinoId || !monto) return;
    await onSubmit({ cuentaDestinoId: Number(cuentaDestinoId), monto: Number(monto), descripcion });
    setMonto(""); setDescripcion("");
    onCancelar();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mt-2 bg-gray-50 rounded p-2">
      <select value={cuentaDestinoId} onChange={(e) => setCuentaDestinoId(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm">
        {cuentasDestino.map((c) => (
          <option key={c.id} value={c.id}>{c.esEfectivo ? "💵 " : ""}{c.nombre} ({c.grupoNombre})</option>
        ))}
      </select>
      <input type="number" step="0.01" placeholder="Monto" value={monto}
        onChange={(e) => setMonto(e.target.value)}
        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm" />
      <input type="text" placeholder="Descripción (opcional)" value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1 text-sm hover:bg-purple-700">
        Transferir
      </button>
      <button type="button" onClick={onCancelar} className="text-gray-400 text-sm hover:underline">
        Cancelar
      </button>
    </form>
  );
}

function CuentaBancariaRow({
  cuenta, todasLasCuentas,
  onRefrescar,
}) {
  const [expandida, setExpandida] = useState(false);
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [movimientos, setMovimientos] = useState([]);

  async function cargarMovimientos() {
    setMovimientos(await listarMovimientosCuenta(cuenta.id));
  }

  useEffect(() => {
    if (expandida) cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida]);

  async function handleNuevoMovimiento(datos) {
    await crearMovimientoCuenta(cuenta.id, datos);
    await cargarMovimientos();
    onRefrescar();
  }
  async function handleEliminarMovimiento(id) {
    await eliminarMovimientoCuenta(cuenta.id, id);
    await cargarMovimientos();
    onRefrescar();
  }
  // Solo un check visual (ej. "ya lo revisé") — no afecta ningun calculo,
  // por eso se actualiza el estado local sin recargar todo.
  async function handleToggleRevisado(id, revisado) {
    setMovimientos((prev) => prev.map((m) => (m.id === id ? { ...m, revisado } : m)));
    await actualizarMovimientoCuenta(cuenta.id, id, revisado);
  }
  async function handleTransferir(datos) {
    await transferirEntreCuentas(cuenta.id, datos);
    await cargarMovimientos();
    onRefrescar();
  }

  // La billetera de efectivo se ordena primero — es el destino más común
  // (retirar efectivo), asi queda a la vista sin tener que buscarla.
  const cuentasDestino = todasLasCuentas
    .filter((c) => c.id !== cuenta.id)
    .sort((a, b) => (b.esEfectivo ? 1 : 0) - (a.esEfectivo ? 1 : 0));

  return (
    <div className="bg-gray-50 rounded px-3 py-2">
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-700 font-medium">{cuenta.esEfectivo ? "💵 " : ""}{cuenta.nombre}</span>
          <span className="text-gray-500"> · saldo ${Number(cuenta.saldoActual).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setExpandida((v) => !v)} className="text-purple-600 hover:underline flex items-center gap-1" title={expandida ? "Ocultar movimientos" : "Ver movimientos"}>
            <IconEye />
          </button>
          <button onClick={() => setMostrarTransferencia((v) => !v)} className="text-purple-600 hover:underline flex items-center gap-1" title="Transferir a otra cuenta">
            <IconTransfer />
          </button>
        </div>
      </div>

      {mostrarTransferencia && cuentasDestino.length > 0 && (
        <TransferenciaForm
          cuentasDestino={cuentasDestino}
          onSubmit={handleTransferir}
          onCancelar={() => setMostrarTransferencia(false)}
        />
      )}

      {expandida && (
        <div className="mt-2 border-t border-gray-200 pt-2 space-y-1">
          {movimientos.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!m.revisado}
                onChange={(e) => handleToggleRevisado(m.id, e.target.checked)}
                title="Marcar (solo visual, no afecta nada)"
                className="shrink-0"
              />
              <span className="text-gray-400 w-20 shrink-0">{m.fecha.slice(0, 10)}</span>
              <span className={`w-16 shrink-0 ${Number(m.monto) < 0 ? "text-red-600" : "text-green-600"}`}>
                ${Math.abs(Number(m.monto)).toFixed(2)}
              </span>
              <span className="flex-1 min-w-0 text-gray-500 break-words">{m.descripcion}</span>
              <button onClick={() => handleEliminarMovimiento(m.id)} className="text-red-500 hover:text-red-700 shrink-0" title="Eliminar movimiento">
                <IconTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {movimientos.length === 0 && <p className="text-sm text-gray-400">Sin movimientos todavía</p>}
          <MovimientoForm onSubmit={handleNuevoMovimiento} />
        </div>
      )}
    </div>
  );
}

// Puramente informativa: la tarjeta de débito no maneja saldo ni
// movimientos propios (eso vive en la cuenta), solo sirve para anotar que
// existe y a qué cuenta está ligada — igual que la caja de tarjeta de
// crédito mostraba corte/pago, aquí solo hay un nombre y un "eliminar".
function TarjetaDebitoCard({ cuenta, onEliminar }) {
  return (
    <div className="rounded-2xl shadow overflow-hidden">
      <TarjetaVisual
        id={cuenta.tarjetaDebito.id}
        nombre={cuenta.tarjetaDebito.nombre}
        etiqueta={`Débito · ${cuenta.nombre}`}
        onEliminar={() => onEliminar(cuenta.id)}
        eliminarTitulo="Eliminar tarjeta"
      />
    </div>
  );
}

function GrupoCuentaCard({
  grupo, esPrimero, esUltimo, todasLasCuentas, onEliminarGrupo, onMoverGrupo,
  onEliminarTarjeta, onEliminarTarjetaDebito, onRefrescar,
}) {
  // Borrar un grupo se lleva TODAS sus cuentas y tarjetas (con todo su
  // historial) en cascada — antes era un solo click sin confirmar, lo cual
  // causó una pérdida de datos real por accidente. Ahora pide confirmar.
  const [confirmandoBorrarGrupo, setConfirmandoBorrarGrupo] = useState(false);
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              onClick={() => onMoverGrupo(grupo.id, "arriba")}
              disabled={esPrimero}
              className="text-gray-400 hover:text-purple-600 disabled:opacity-25 disabled:hover:text-gray-400 leading-none text-xs"
              title="Subir"
            >
              ▲
            </button>
            <button
              onClick={() => onMoverGrupo(grupo.id, "abajo")}
              disabled={esUltimo}
              className="text-gray-400 hover:text-purple-600 disabled:opacity-25 disabled:hover:text-gray-400 leading-none text-xs"
              title="Bajar"
            >
              ▼
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{grupo.nombre}</h2>
        </div>
        {confirmandoBorrarGrupo ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">¿Borrar "{grupo.nombre}" y todo su contenido?</span>
            <button
              onClick={async () => { await onEliminarGrupo(grupo.id); setConfirmandoBorrarGrupo(false); }}
              className="text-red-600 font-medium hover:underline"
            >
              Sí
            </button>
            <button onClick={() => setConfirmandoBorrarGrupo(false)} className="text-gray-500 hover:underline">No</button>
          </span>
        ) : (
          <button onClick={() => setConfirmandoBorrarGrupo(true)} className="text-red-500 hover:text-red-700" title="Eliminar grupo">
            <IconTrash />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {grupo.cuentas.map((c) => (
          <CuentaBancariaRow
            key={c.id}
            cuenta={c}
            todasLasCuentas={todasLasCuentas}
            onRefrescar={onRefrescar}
          />
        ))}
        {grupo.cuentas.length === 0 && (
          <p className="text-sm text-gray-400">Este grupo aún no tiene cuentas</p>
        )}
      </div>

      {grupo.cuentas.filter((c) => c.tarjetaDebito).map((c) => (
        <TarjetaDebitoCard key={c.tarjetaDebito.id} cuenta={c} onEliminar={onEliminarTarjetaDebito} />
      ))}

      {grupo.tarjetas.map((t) => (
        <TarjetaCard key={t.id} tarjeta={t} todasLasCuentas={todasLasCuentas} onEliminar={onEliminarTarjeta} onRefrescar={onRefrescar} />
      ))}
    </div>
  );
}

function FormNuevoGrupo({ onSubmit }) {
  const [nombre, setNombre] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    await onSubmit(nombre.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input type="text" placeholder="Nombre del grupo (ej. Banco X)" value={nombre}
        onChange={(e) => setNombre(e.target.value)} autoFocus
        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1" />
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1.5 text-sm hover:bg-purple-700">
        Crear grupo
      </button>
    </form>
  );
}

const OPCIONES_AGREGAR = [
  { tipo: "grupo", etiqueta: "Grupo nuevo" },
  { tipo: "cuenta", etiqueta: "Cuenta" },
  { tipo: "tarjetaCredito", etiqueta: "Tarjeta de crédito" },
  { tipo: "tarjetaDebito", etiqueta: "Tarjeta de débito" },
];

function AgregarMenu({ grupos, todasLasCuentas, onNuevoGrupo, onNuevaCuenta, onNuevaTarjeta, onNuevaTarjetaDebito }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(null);

  function cerrar() {
    setAbierto(false);
    setTipo(null);
  }

  const cuentasSinDebito = todasLasCuentas.filter((c) => !c.tarjetaDebito);

  return (
    <div className="relative">
      <button
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        className="bg-purple-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-purple-700"
        title="Agregar"
      >
        <IconPlus />
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-100 p-4 z-10 space-y-3">
          {tipo === null ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">¿Qué querés agregar?</h3>
                <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              <div className="flex flex-col gap-1">
                {OPCIONES_AGREGAR.map((o) => (
                  <button
                    key={o.tipo}
                    onClick={() => setTipo(o.tipo)}
                    className="text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded px-2 py-1.5"
                  >
                    {o.etiqueta}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setTipo(null)} className="text-purple-600 text-sm hover:underline">← Volver</button>
                <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              {tipo === "grupo" && (
                <FormNuevoGrupo onSubmit={async (nombre) => { await onNuevoGrupo(nombre); cerrar(); }} />
              )}
              {tipo === "cuenta" && (
                <FormNuevaCuenta grupos={grupos} onSubmit={async (grupoId, nombre) => { await onNuevaCuenta(grupoId, nombre); cerrar(); }} />
              )}
              {tipo === "tarjetaCredito" && (
                <FormNuevaTarjetaCredito grupos={grupos} onSubmit={async (grupoId, datos) => { await onNuevaTarjeta(grupoId, datos); cerrar(); }} />
              )}
              {tipo === "tarjetaDebito" && (
                <FormNuevaTarjetaDebito cuentas={cuentasSinDebito} onSubmit={async (cuentaId, nombre) => { await onNuevaTarjetaDebito(cuentaId, nombre); cerrar(); }} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CuentasPage() {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setGrupos(await listarGruposCuenta());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleNuevoGrupo(nombre) {
    await crearGrupoCuenta(nombre);
    cargar();
  }
  async function handleEliminarGrupo(id) {
    try {
      await eliminarGrupoCuenta(id);
      cargar();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo eliminar el grupo");
    }
  }
  async function handleMoverGrupo(id, direccion) {
    await moverGrupoCuenta(id, direccion);
    cargar();
  }
  async function handleNuevaCuenta(grupoId, nombre) {
    await crearCuentaBancaria(grupoId, nombre);
    cargar();
  }
  async function handleNuevaTarjeta(grupoId, datos) {
    await crearTarjeta({ ...datos, grupoId });
    cargar();
  }
  async function handleEliminarTarjeta(id) {
    await eliminarTarjeta(id);
    cargar();
  }
  async function handleNuevaTarjetaDebito(cuentaId, nombre) {
    await crearTarjetaDebito(cuentaId, nombre);
    cargar();
  }
  async function handleEliminarTarjetaDebito(cuentaId) {
    await eliminarTarjetaDebito(cuentaId);
    cargar();
  }
  const [configurandoEfectivo, setConfigurandoEfectivo] = useState(false);
  async function handleConfigurarEfectivo() {
    setConfigurandoEfectivo(true);
    try {
      await crearCuentaEfectivo();
      await cargar();
    } finally {
      setConfigurandoEfectivo(false);
    }
  }

  if (cargando) {
    return <div className="p-6 text-center text-gray-500">Cargando cuentas...</div>;
  }

  const todasLasCuentas = grupos.flatMap((g) =>
    g.cuentas.map((c) => ({ ...c, grupoNombre: g.nombre }))
  );
  const tieneEfectivo = todasLasCuentas.some((c) => c.esEfectivo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Cuentas</h1>
        <div className="flex items-center gap-3">
          {!tieneEfectivo && (
            <button
              onClick={handleConfigurarEfectivo}
              disabled={configurandoEfectivo}
              className="text-sm text-purple-600 hover:underline disabled:opacity-50"
              title="Crea una cuenta 'Billetera Efectivo' para llevar el saldo de tu efectivo"
            >
              {configurandoEfectivo ? "Configurando..." : "💵 Configurar mi Efectivo"}
            </button>
          )}
          <AgregarMenu
            grupos={grupos}
            todasLasCuentas={todasLasCuentas}
            onNuevoGrupo={handleNuevoGrupo}
            onNuevaCuenta={handleNuevaCuenta}
            onNuevaTarjeta={handleNuevaTarjeta}
            onNuevaTarjetaDebito={handleNuevaTarjetaDebito}
          />
        </div>
      </div>

      {grupos.map((g, i) => (
        <GrupoCuentaCard
          key={g.id}
          grupo={g}
          esPrimero={i === 0}
          esUltimo={i === grupos.length - 1}
          todasLasCuentas={todasLasCuentas}
          onEliminarTarjetaDebito={handleEliminarTarjetaDebito}
          onEliminarGrupo={handleEliminarGrupo}
          onMoverGrupo={handleMoverGrupo}
          onEliminarTarjeta={handleEliminarTarjeta}
          onRefrescar={cargar}
        />
      ))}
      {grupos.length === 0 && (
        <p className="text-sm text-gray-400 text-center">Aún no tienes grupos de cuenta registrados</p>
      )}
    </div>
  );
}
