const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");
const { calcularResumenMes } = require("./resumenMensualService");

async function calcularResumenAnual(usuarioId, anio) {
  const presupuestos = await prisma.presupuestoMensual.findMany({
    where: { usuarioId, anio },
    include: {
      ingresos: true,
      ahorros: true,
      transacciones: true,
      gastosFijosMes: true,
      trackerDiario: true,
      deudasMes: true,
    },
  });

  const meses = [];
  for (let mes = 1; mes <= 12; mes++) {
    const p = presupuestos.find((x) => x.mes === mes);
    if (!p) {
      meses.push({ mes, ingresosReal: 0, gastosReal: 0, ahorroReal: 0 });
      continue;
    }

    const ingresosReal = redondear(p.ingresos.reduce((s, i) => s + Number(i.montoReal || 0), 0));
    const ahorroReal = redondear(p.ahorros.reduce((s, a) => s + Number(a.montoReal || 0), 0));
    const gastosFijosReal = redondear(p.gastosFijosMes.reduce((s, g) => s + Number(g.montoReal || 0), 0));
    const transaccionesReal = redondear(p.transacciones.reduce((s, t) => s + Number(t.monto), 0));
    const trackerReal = redondear(p.trackerDiario.reduce((s, t) => s + Number(t.monto), 0));
    const deudasReal = redondear(p.deudasMes.reduce((s, d) => s + Number(d.montoReal || 0), 0));
    const gastosReal = redondear(gastosFijosReal + transaccionesReal + trackerReal + deudasReal);

    meses.push({ mes, ingresosReal, gastosReal, ahorroReal });
  }

  const totalAhorradoAnual = redondear(meses.reduce((s, m) => s + m.ahorroReal, 0));
  const mesMasGasto = meses.reduce((max, m) => (m.gastosReal > max.gastosReal ? m : max), meses[0]).mes;
  const mesMasAhorro = meses.reduce((max, m) => (m.ahorroReal > max.ahorroReal ? m : max), meses[0]).mes;

  // Tendencia: para cada mes con presupuesto, cuenta cuántas veces se excedió
  // cada categoría (gastos fijos, y variables con estimado conocido: Transporte/Comida).
  const conteoExcesos = new Map();
  for (const p of presupuestos) {
    const resumenMes = await calcularResumenMes(usuarioId, anio, p.mes);
    if (resumenMes.gastosFijos.estimado > 0 && resumenMes.gastosFijos.real > resumenMes.gastosFijos.estimado) {
      conteoExcesos.set("Gastos fijos", (conteoExcesos.get("Gastos fijos") || 0) + 1);
    }
    if (resumenMes.deudas.estimado > 0 && resumenMes.deudas.real > resumenMes.deudas.estimado) {
      conteoExcesos.set("Deudas", (conteoExcesos.get("Deudas") || 0) + 1);
    }
    for (const cat of resumenMes.gastosVariables.porCategoria) {
      if (cat.estimado && cat.real > cat.estimado) {
        conteoExcesos.set(cat.nombre, (conteoExcesos.get(cat.nombre) || 0) + 1);
      }
    }
  }

  let categoriaTendencia = null;
  let maxExcesos = 0;
  for (const [nombre, veces] of conteoExcesos) {
    if (veces > maxExcesos) {
      maxExcesos = veces;
      categoriaTendencia = nombre;
    }
  }

  return {
    anio,
    meses,
    totalAhorradoAnual,
    mesMasGasto,
    mesMasAhorro,
    tendencia: categoriaTendencia ? { categoria: categoriaTendencia, mesesExcedidos: maxExcesos } : null,
  };
}

module.exports = { calcularResumenAnual };
