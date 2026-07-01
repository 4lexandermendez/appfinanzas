const prisma = require("../lib/prisma");
const { formatDateKey, diasEnMes } = require("../utils/fecha");
const { redondear } = require("../utils/dinero");
const { tipoDeDia, conceptosParaTipo } = require("./calendarioService");

// Para días ya pasados con registro real en el Tracker Diario, se usa el monto
// real registrado ese día en vez del monto actual de Ajustes. Así, si el usuario
// cambia un monto hoy, no se reescribe retroactivamente el estimado de días que
// ya pasaron y para los que no hay real, se muestra el monto vigente al momento
// del cálculo (aproximación: no existe un historial de montos por fecha).
async function calcularEstimadoMes(usuarioId, anio, mes) {
  const ajuste = await prisma.ajusteTracker.findUnique({ where: { usuarioId } });
  if (!ajuste) return null;

  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes - 1, diasEnMes(anio, mes)));

  const diasLibres = await prisma.diaLibre.findMany({
    where: { usuarioId, fecha: { gte: inicioMes, lte: finMes } },
  });
  const diasLibresSet = new Set(diasLibres.map((d) => formatDateKey(d.fecha)));

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId, anio, mes } },
  });

  const realesPorClave = new Map();
  if (presupuesto) {
    const registros = await prisma.trackerDiario.findMany({ where: { presupuestoId: presupuesto.id } });
    for (const r of registros) {
      const clave = `${formatDateKey(r.fecha)}_${r.concepto}`;
      const previo = realesPorClave.get(clave) || 0;
      realesPorClave.set(clave, previo + Number(r.monto));
    }
  }

  const hoy = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

  const totalPorConcepto = { PASAJE_IDA: 0, DESAYUNO: 0, ALMUERZO: 0, PASAJE_REGRESO: 0 };
  const quincenas = [
    { quincena: 1, estimado: 0 },
    { quincena: 2, estimado: 0 },
  ];
  let totalGeneral = 0;
  const dias = [];

  const totalDias = diasEnMes(anio, mes);
  for (let d = 1; d <= totalDias; d++) {
    const fecha = new Date(Date.UTC(anio, mes - 1, d));
    const tipo = tipoDeDia(fecha, ajuste, diasLibresSet);
    const conceptosBase = conceptosParaTipo(tipo, ajuste);
    const esPasado = fecha < hoy;

    const items = conceptosBase.map((c) => {
      const clave = `${formatDateKey(fecha)}_${c.concepto}`;
      const real = realesPorClave.get(clave);
      const usaReal = esPasado && real !== undefined;
      return { concepto: c.concepto, monto: usaReal ? real : c.monto, esReal: usaReal };
    });

    const totalDia = redondear(items.reduce((s, i) => s + i.monto, 0));
    for (const i of items) totalPorConcepto[i.concepto] = redondear(totalPorConcepto[i.concepto] + i.monto);
    totalGeneral = redondear(totalGeneral + totalDia);
    const q = d <= 15 ? 0 : 1;
    quincenas[q].estimado = redondear(quincenas[q].estimado + totalDia);

    dias.push({ fecha: formatDateKey(fecha), tipo, items, total: totalDia });
  }

  return { dias, totalPorConcepto, totalGeneral, quincenas };
}

module.exports = { calcularEstimadoMes };
