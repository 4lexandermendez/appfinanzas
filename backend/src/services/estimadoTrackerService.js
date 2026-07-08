const prisma = require("../lib/prisma");
const { formatDateKey, diasEnMes } = require("../utils/fecha");
const { redondear } = require("../utils/dinero");
const { tipoDeDia, conceptosParaTipo } = require("./calendarioService");
const { versionVigenteEnFecha } = require("../utils/vigencia");

const CONCEPTOS_TRANSPORTE = new Set(["PASAJE_IDA", "PASAJE_REGRESO"]);

// Función pura (sin acceso a base de datos): recibe todo lo necesario ya
// cargado en memoria. Permite reutilizar el cálculo para un año completo
// sin repetir 12 veces las mismas consultas (ajuste, días libres, etc.).
//
// El Estimado es una proyección fija del calendario (Ajustes + patrón de
// sábados + días libres) y NO se mezcla con lo ya registrado en el Tracker
// Diario: si se sustituyera por el real de días pasados, el "Estimado"
// bajaría cada vez que el usuario registrara algo (incluyendo el botón $0),
// perdiendo su función de ser un presupuesto estable contra el cual comparar
// el Real.
//
// "versiones" es la lista de AjusteTracker del usuario, ordenada ascendente
// por creadoEn: cada cambio guardado crea una fila nueva en vez de
// sobreescribir, así que para cada día del mes se usa la versión que estaba
// vigente ese día puntual (ver versionVigenteEnFecha) — un cambio de monto a
// mitad de mes ya no afecta retroactivamente los días ya pasados.
function calcularEstimadoMesPuro(versiones, diasLibresSet, anio, mes) {
  const totalPorConcepto = { PASAJE_IDA: 0, DESAYUNO: 0, ALMUERZO: 0, PASAJE_REGRESO: 0 };
  const quincenas = [
    { quincena: 1, estimado: 0, transporte: 0, comida: 0 },
    { quincena: 2, estimado: 0, transporte: 0, comida: 0 },
  ];
  let totalGeneral = 0;
  const dias = [];

  const totalDias = diasEnMes(anio, mes);
  for (let d = 1; d <= totalDias; d++) {
    const fecha = new Date(Date.UTC(anio, mes - 1, d));
    const ajusteDia = versionVigenteEnFecha(versiones, fecha);
    if (!ajusteDia) {
      dias.push({ fecha: formatDateKey(fecha), tipo: null, items: [], total: 0 });
      continue;
    }
    const tipo = tipoDeDia(fecha, ajusteDia, diasLibresSet);
    const conceptosBase = conceptosParaTipo(tipo, ajusteDia);

    const items = conceptosBase.map((c) => ({ concepto: c.concepto, monto: c.monto, esReal: false }));

    const totalDia = redondear(items.reduce((s, i) => s + i.monto, 0));
    for (const i of items) totalPorConcepto[i.concepto] = redondear(totalPorConcepto[i.concepto] + i.monto);
    totalGeneral = redondear(totalGeneral + totalDia);
    const q = d <= 15 ? 0 : 1;
    quincenas[q].estimado = redondear(quincenas[q].estimado + totalDia);
    const transporteDia = redondear(items.filter((i) => CONCEPTOS_TRANSPORTE.has(i.concepto)).reduce((s, i) => s + i.monto, 0));
    const comidaDia = redondear(totalDia - transporteDia);
    quincenas[q].transporte = redondear(quincenas[q].transporte + transporteDia);
    quincenas[q].comida = redondear(quincenas[q].comida + comidaDia);

    dias.push({ fecha: formatDateKey(fecha), tipo, items, total: totalDia });
  }

  return { dias, totalPorConcepto, totalGeneral, quincenas };
}

async function calcularEstimadoMes(usuarioId, anio, mes) {
  const versiones = await prisma.ajusteTracker.findMany({
    where: { usuarioId },
    orderBy: { creadoEn: "asc" },
  });
  if (versiones.length === 0) return null;

  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes - 1, diasEnMes(anio, mes)));

  const diasLibres = await prisma.diaLibre.findMany({
    where: { usuarioId, fecha: { gte: inicioMes, lte: finMes } },
  });
  const diasLibresSet = new Set(diasLibres.map((d) => formatDateKey(d.fecha)));

  return calcularEstimadoMesPuro(versiones, diasLibresSet, anio, mes);
}

module.exports = { calcularEstimadoMes, calcularEstimadoMesPuro, CONCEPTOS_TRANSPORTE };
