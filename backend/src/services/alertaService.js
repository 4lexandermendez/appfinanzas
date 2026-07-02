const prisma = require("../lib/prisma");
const { calcularResumenMes } = require("./resumenMensualService");
const { calcularInfoTarjeta } = require("./tarjetaService");
const { listarConfig } = require("./alertaConfigService");

function configPorTipo(configs) {
  const mapa = new Map();
  for (const c of configs) mapa.set(c.tipo, c);
  return mapa;
}

function alertaPresupuesto(nombre, real, estimado, umbral) {
  if (!estimado || estimado <= 0) return null;
  const porcentaje = (real / estimado) * 100;
  if (porcentaje >= 100) {
    return {
      tipo: "PRESUPUESTO_CATEGORIA",
      nivel: "rojo",
      icono: "🔴",
      mensaje: `${nombre}: superaste el presupuesto ($${real.toFixed(2)} de $${estimado.toFixed(2)})`,
    };
  }
  if (porcentaje >= umbral) {
    return {
      tipo: "PRESUPUESTO_CATEGORIA",
      nivel: "amarillo",
      icono: "⚠️",
      mensaje: `${nombre}: llevás ${porcentaje.toFixed(0)}% del presupuesto ($${real.toFixed(2)} de $${estimado.toFixed(2)})`,
    };
  }
  return null;
}

async function calcularAlertas(usuarioId, anio, mes) {
  const configs = await listarConfig(usuarioId);
  const mapa = configPorTipo(configs);
  const resumen = await calcularResumenMes(usuarioId, anio, mes);
  const alertas = [];

  const cfgPresupuesto = mapa.get("PRESUPUESTO_CATEGORIA");
  if (cfgPresupuesto?.activo) {
    const umbral = cfgPresupuesto.porcentajeAlerta ?? 80;

    const aFijos = alertaPresupuesto("Gastos fijos", resumen.gastosFijos.real, resumen.gastosFijos.estimado, umbral);
    if (aFijos) alertas.push(aFijos);

    const aDeudas = alertaPresupuesto("Deudas", resumen.deudas.real, resumen.deudas.estimado, umbral);
    if (aDeudas) alertas.push(aDeudas);

    for (const cat of resumen.gastosVariables.porCategoria) {
      if (cat.estimado === null) continue;
      const a = alertaPresupuesto(cat.nombre, cat.real, cat.estimado, umbral);
      if (a) alertas.push(a);
    }
  }

  const cfgLimite = mapa.get("LIMITE_VARIABLES");
  if (cfgLimite?.activo) {
    const { real, estimadoConocido } = resumen.gastosVariables;
    if (estimadoConocido > 0 && real >= estimadoConocido) {
      alertas.push({
        tipo: "LIMITE_VARIABLES",
        nivel: "rojo",
        icono: "🚫",
        mensaje: "Estás al límite en Gastos Variables, reducí o ajustá tu presupuesto",
      });
    }
  }

  const cfgCorte = mapa.get("TARJETA_CORTE");
  const cfgPago = mapa.get("TARJETA_PAGO");
  if (cfgCorte?.activo || cfgPago?.activo) {
    const tarjetas = await prisma.tarjetaCredito.findMany({ where: { usuarioId } });
    for (const t of tarjetas) {
      const info = calcularInfoTarjeta(t);
      if (cfgCorte?.activo && info.diasParaCorte <= (cfgCorte.porcentajeAlerta ?? 3)) {
        alertas.push({
          tipo: "TARJETA_CORTE",
          nivel: "info",
          icono: "💳",
          mensaje: `${t.nombre} corta en ${info.diasParaCorte} día${info.diasParaCorte === 1 ? "" : "s"}, llevás $${info.pagoTotal.toFixed(2)} cargado`,
        });
      }
      if (cfgPago?.activo && info.diasParaPago <= (cfgPago.porcentajeAlerta ?? 3)) {
        alertas.push({
          tipo: "TARJETA_PAGO",
          nivel: "info",
          icono: "📅",
          mensaje: `Tenés que pagar ${t.nombre} en ${info.diasParaPago} día${info.diasParaPago === 1 ? "" : "s"}, debés $${info.pagoTotal.toFixed(2)}`,
        });
      }
    }
  }

  const cfgResumen = mapa.get("RESUMEN_GENERAL");
  if (cfgResumen?.activo) {
    const gastoReal = resumen.gastosFijos.real + resumen.gastosVariables.real + resumen.deudas.real;
    const presupuestoConocido =
      resumen.gastosFijos.estimado + resumen.gastosVariables.estimadoConocido + resumen.deudas.estimado;
    const disponible = presupuestoConocido - gastoReal;

    const ahora = new Date();
    let mensaje = `Este mes llevás gastado $${gastoReal.toFixed(2)} de $${presupuestoConocido.toFixed(2)}`;
    if (ahora.getFullYear() === anio && ahora.getMonth() + 1 === mes) {
      const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
      const diasRestantes = ultimoDia - ahora.getDate();
      mensaje += `. Te quedan ${diasRestantes} día${diasRestantes === 1 ? "" : "s"} y $${disponible.toFixed(2)} disponibles`;
    }

    alertas.push({ tipo: "RESUMEN_GENERAL", nivel: "info", icono: "📊", mensaje });
  }

  return alertas;
}

module.exports = { calcularAlertas };
