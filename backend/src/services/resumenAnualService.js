const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");

async function calcularResumenAnual(usuarioId, anio) {
  const presupuestos = await prisma.presupuestoMensual.findMany({
    where: { usuarioId, anio },
    include: { ingresos: true, ahorros: true, transacciones: true, gastosFijosMes: true, trackerDiario: true },
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
    const gastosReal = redondear(gastosFijosReal + transaccionesReal + trackerReal);

    meses.push({ mes, ingresosReal, gastosReal, ahorroReal });
  }

  return { anio, meses };
}

module.exports = { calcularResumenAnual };
