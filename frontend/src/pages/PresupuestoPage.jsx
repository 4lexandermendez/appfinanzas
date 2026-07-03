import { useEffect, useState } from "react";
import {
  listarIngresos, crearIngreso, actualizarIngreso, eliminarIngreso,
} from "../api/ingresos";
import {
  listarAhorros, crearAhorro, actualizarAhorro, eliminarAhorro,
} from "../api/ahorros";
import {
  listarGastosFijosConfig, crearGastoFijo, actualizarGastoFijo, eliminarGastoFijo,
  guardarGastoFijoMensual,
} from "../api/gastosFijos";
import {
  listarDeudasConfig, crearDeuda, actualizarDeuda, eliminarDeuda, guardarDeudaMensual,
} from "../api/deudas";
import { listarEstimadoVariables, guardarEstimadoVariable } from "../api/categoriasVariablesMensual";
import { crearCategoria } from "../api/categorias";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function hoy() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

// Espejo de estaVigenteEnMes del backend: un gasto fijo solo cuenta para un
// mes si ya existía para entonces y, si fue deshabilitado, si eso pasó
// después de que el mes ya había empezado.
function estaVigenteEnMes(item, anio, mes) {
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 1));
  const creadoEn = new Date(item.creadoEn);
  if (creadoEn >= finMes) return false;
  if (item.desactivadoEn && new Date(item.desactivadoEn) <= inicioMes) return false;
  return true;
}

function NuevoItemForm({ onSubmit, placeholder = "Nombre", placeholderMonto = "Estimado" }) {
  const [nombre, setNombre] = useState("");
  const [montoEstimado, setMontoEstimado] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !montoEstimado) return;
    await onSubmit({ nombre: nombre.trim(), montoEstimado: Number(montoEstimado) });
    setNombre("");
    setMontoEstimado("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="text"
        placeholder={placeholder}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder={placeholderMonto}
        value={montoEstimado}
        onChange={(e) => setMontoEstimado(e.target.value)}
        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <button type="submit" className="bg-purple-600 text-white rounded px-3 py-1 text-sm hover:bg-purple-700">
        Agregar
      </button>
    </form>
  );
}

export default function PresupuestoPage() {
  const [{ anio, mes }, setPeriodo] = useState(hoy());
  const [ingresos, setIngresos] = useState([]);
  const [ahorros, setAhorros] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [estimadoVariables, setEstimadoVariables] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargarTodo() {
    setCargando(true);
    const [i, a, g, d, ev] = await Promise.all([
      listarIngresos(anio, mes),
      listarAhorros(anio, mes),
      listarGastosFijosConfig(),
      listarDeudasConfig(),
      listarEstimadoVariables(anio, mes),
    ]);
    setIngresos(i);
    setAhorros(a);
    setGastosFijos(g);
    setDeudas(d);
    setEstimadoVariables(ev.filter((c) => !c.esDefault));
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  async function handleNuevoIngreso(datos) {
    await crearIngreso({ ...datos, anio, mes });
    cargarTodo();
  }
  async function handleRealIngreso(id, montoReal) {
    await actualizarIngreso(id, { montoReal: montoReal === "" ? null : Number(montoReal) });
    cargarTodo();
  }
  async function handleEliminarIngreso(id) {
    await eliminarIngreso(id);
    cargarTodo();
  }

  async function handleNuevoAhorro(datos) {
    await crearAhorro({ ...datos, anio, mes });
    cargarTodo();
  }
  async function handleRealAhorro(id, montoReal) {
    await actualizarAhorro(id, { montoReal: montoReal === "" ? null : Number(montoReal) });
    cargarTodo();
  }
  async function handleEliminarAhorro(id) {
    await eliminarAhorro(id);
    cargarTodo();
  }

  async function handleNuevoGastoFijo(datos) {
    await crearGastoFijo(datos);
    cargarTodo();
  }
  async function handleToggleActivo(id, activo) {
    await actualizarGastoFijo(id, { activo: !activo });
    cargarTodo();
  }
  async function handleEliminarGastoFijo(id) {
    await eliminarGastoFijo(id);
    cargarTodo();
  }
  async function handleRealGastoFijo(gastoFijoConfigId, montoReal) {
    if (montoReal === "") return;
    await guardarGastoFijoMensual({ gastoFijoConfigId, anio, mes, montoReal: Number(montoReal) });
    cargarTodo();
  }

  async function handleNuevaDeuda(datos) {
    await crearDeuda({ nombre: datos.nombre, saldoActual: datos.montoEstimado });
    cargarTodo();
  }
  async function handleToggleActivaDeuda(id, activo) {
    await actualizarDeuda(id, { activo: !activo });
    cargarTodo();
  }
  async function handleEliminarDeudaConfig(id) {
    await eliminarDeuda(id);
    cargarTodo();
  }
  async function handleDeudaMensual(deudaConfigId, campo, valor) {
    if (valor === "") return;
    await guardarDeudaMensual({ deudaConfigId, anio, mes, [campo]: Number(valor) });
    cargarTodo();
  }

  async function handleEstimadoVariable(categoriaId, montoEstimado) {
    if (montoEstimado === "") return;
    await guardarEstimadoVariable({ categoriaId, anio, mes, montoEstimado: Number(montoEstimado) });
    cargarTodo();
  }

  async function handleNuevoGastoVariable(datos) {
    const existente = estimadoVariables.find(
      (c) => c.nombre.toLowerCase() === datos.nombre.toLowerCase()
    );
    const categoriaId = existente ? existente.categoriaId : (await crearCategoria(datos.nombre)).id;
    await guardarEstimadoVariable({ categoriaId, anio, mes, montoEstimado: datos.montoEstimado });
    cargarTodo();
  }

  if (cargando) {
    return <div className="p-6 text-center text-gray-500">Cargando presupuesto...</div>;
  }

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

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-6 py-2 font-semibold text-sm bg-green-100 text-green-800">Ingresos</h2>
        <div className="p-6">
          <div className="space-y-2">
            {ingresos.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{i.nombre}</span>
                <span className="text-gray-400">Est. ${Number(i.montoEstimado).toFixed(2)}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={i.montoReal ?? ""}
                  placeholder="Real"
                  onBlur={(e) => handleRealIngreso(i.id, e.target.value)}
                  className="w-24 border border-gray-300 rounded px-2 py-1"
                />
                <button onClick={() => handleEliminarIngreso(i.id)} className="text-red-500 hover:underline">
                  Eliminar
                </button>
              </div>
            ))}
            {ingresos.length === 0 && <p className="text-sm text-gray-400">Sin ingresos este mes</p>}
          </div>
          <NuevoItemForm onSubmit={handleNuevoIngreso} placeholder="Ej. Quincena 1" />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-6 py-2 font-semibold text-sm bg-blue-100 text-blue-800">Ahorros</h2>
        <div className="p-6">
          <div className="space-y-2">
            {ahorros.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{a.nombre}</span>
                <span className="text-gray-400">Est. ${Number(a.montoEstimado).toFixed(2)}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={a.montoReal ?? ""}
                  placeholder="Real"
                  onBlur={(e) => handleRealAhorro(a.id, e.target.value)}
                  className="w-24 border border-gray-300 rounded px-2 py-1"
                />
                <button onClick={() => handleEliminarAhorro(a.id)} className="text-red-500 hover:underline">
                  Eliminar
                </button>
              </div>
            ))}
            {ahorros.length === 0 && <p className="text-sm text-gray-400">Sin ahorros este mes</p>}
          </div>
          <NuevoItemForm onSubmit={handleNuevoAhorro} placeholder="Ej. Fondo de emergencia" />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-6 py-2 font-semibold text-sm bg-pink-100 text-pink-800">Gastos fijos</h2>
        <div className="p-6">
          <p className="text-xs text-gray-400 mb-3">
            Lista reutilizable. Deshabilitar no borra el histórico, solo lo oculta del mes.
          </p>
          <div className="space-y-2">
            {gastosFijos.map((g) => (
              <div key={g.id} className={`flex items-center gap-2 text-sm ${!g.activo ? "opacity-40" : ""}`}>
                <span className="flex-1">{g.nombre}</span>
                <span className="text-gray-400">Est. ${Number(g.montoEstimado).toFixed(2)}</span>
                {estaVigenteEnMes(g, anio, mes) ? (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Real del mes"
                    onBlur={(e) => handleRealGastoFijo(g.id, e.target.value)}
                    className="w-28 border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <span className="text-xs text-gray-300 w-28">No vigente este mes</span>
                )}
                <button onClick={() => handleToggleActivo(g.id, g.activo)} className="text-purple-600 hover:underline">
                  {g.activo ? "Deshabilitar" : "Reactivar"}
                </button>
                <button onClick={() => handleEliminarGastoFijo(g.id)} className="text-red-500 hover:underline">
                  Eliminar
                </button>
              </div>
            ))}
            {gastosFijos.length === 0 && <p className="text-sm text-gray-400">Sin gastos fijos configurados</p>}
          </div>
          <NuevoItemForm onSubmit={handleNuevoGastoFijo} placeholder="Ej. Netflix" />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-6 py-2 font-semibold text-sm bg-pink-100 text-pink-800">Deudas</h2>
        <div className="p-6">
          <p className="text-xs text-gray-400 mb-3">
            "Actual" es el saldo pendiente: baja solo cuando registrás un Real (pago).
          </p>
          <div className="space-y-2">
            {deudas.map((d) => (
              <div key={d.id} className={`flex items-center gap-2 text-sm ${!d.activo ? "opacity-40" : ""}`}>
                <span className="flex-1">{d.nombre}</span>
                <span className="text-gray-400">Actual ${Number(d.saldoActual).toFixed(2)}</span>
                {estaVigenteEnMes(d, anio, mes) ? (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Estimado del mes"
                      onBlur={(e) => handleDeudaMensual(d.id, "montoEstimado", e.target.value)}
                      className="w-28 border border-gray-300 rounded px-2 py-1"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Real (pago)"
                      onBlur={(e) => handleDeudaMensual(d.id, "montoReal", e.target.value)}
                      className="w-24 border border-gray-300 rounded px-2 py-1"
                    />
                  </>
                ) : (
                  <span className="text-xs text-gray-300 w-28">No vigente este mes</span>
                )}
                <button onClick={() => handleToggleActivaDeuda(d.id, d.activo)} className="text-purple-600 hover:underline">
                  {d.activo ? "Deshabilitar" : "Reactivar"}
                </button>
                <button onClick={() => handleEliminarDeudaConfig(d.id)} className="text-red-500 hover:underline">
                  Eliminar
                </button>
              </div>
            ))}
            {deudas.length === 0 && <p className="text-sm text-gray-400">Sin deudas registradas</p>}
          </div>
          <NuevoItemForm onSubmit={handleNuevaDeuda} placeholder="Ej. Préstamo moto" placeholderMonto="Saldo actual" />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-6 py-2 font-semibold text-sm bg-yellow-100 text-yellow-800">Gastos variables (estimado)</h2>
        <div className="p-6">
          <p className="text-xs text-gray-400 mb-3">
            Transporte y Comida usan el estimado automático del Tracker. Acá va el estimado del resto (Temu,
            Universidad, etc.) — el nombre se autocompleta desde tu historial al registrar el gasto real en
            Registro Rápido.
          </p>
          <div className="space-y-2">
            {estimadoVariables.map((c) => (
              <div key={c.categoriaId} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{c.nombre}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={c.montoEstimado ?? ""}
                  placeholder="Estimado"
                  onBlur={(e) => handleEstimadoVariable(c.categoriaId, e.target.value)}
                  className="w-28 border border-gray-300 rounded px-2 py-1"
                />
              </div>
            ))}
            {estimadoVariables.length === 0 && (
              <p className="text-sm text-gray-400">
                Todavía no tenés ningún gasto variable este mes (fuera de Transporte/Comida).
              </p>
            )}
          </div>
          <NuevoItemForm onSubmit={handleNuevoGastoVariable} placeholder="Ej. Temu" />
        </div>
      </section>
    </div>
  );
}
