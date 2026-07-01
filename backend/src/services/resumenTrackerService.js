const prisma = require("../lib/prisma");
const { redondear } = require("../utils/dinero");

const CONCEPTOS_TRANSPORTE = new Set(["PASAJE_IDA", "PASAJE_REGRESO"]);

async function calcularResumenReal(usuarioId, anio, mes) {
  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId, anio, mes } },
  });

  const resultado = {
    transporteReal: 0,
    comidaReal: 0,
    quincenas: [
      { quincena: 1, transporte: 0, comida: 0 },
      { quincena: 2, transporte: 0, comida: 0 },
    ],
  };

  if (!presupuesto) return resultado;

  const registros = await prisma.trackerDiario.findMany({ where: { presupuestoId: presupuesto.id } });

  for (const r of registros) {
    const monto = Number(r.monto);
    const dia = r.fecha.getUTCDate();
    const quincena = dia <= 15 ? 0 : 1;
    const esTransporte = CONCEPTOS_TRANSPORTE.has(r.concepto);

    if (esTransporte) {
      resultado.transporteReal = redondear(resultado.transporteReal + monto);
      resultado.quincenas[quincena].transporte = redondear(resultado.quincenas[quincena].transporte + monto);
    } else {
      resultado.comidaReal = redondear(resultado.comidaReal + monto);
      resultado.quincenas[quincena].comida = redondear(resultado.quincenas[quincena].comida + monto);
    }
  }

  return resultado;
}

module.exports = { calcularResumenReal };
