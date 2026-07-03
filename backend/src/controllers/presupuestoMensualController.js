const prisma = require("../lib/prisma");
const { obtenerOCrearPresupuesto } = require("../services/presupuestoService");

async function obtenerNotas(req, res) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "anio y mes son requeridos (mes entre 1 y 12)" });
  }

  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { usuarioId_anio_mes: { usuarioId: req.usuarioId, anio, mes } },
  });

  res.json({ notas: presupuesto?.notas || "" });
}

async function guardarNotas(req, res) {
  const { anio, mes, notas } = req.body;
  if (!anio || !mes) {
    return res.status(400).json({ error: "anio y mes son requeridos" });
  }

  const presupuesto = await obtenerOCrearPresupuesto(req.usuarioId, Number(anio), Number(mes));
  const actualizado = await prisma.presupuestoMensual.update({
    where: { id: presupuesto.id },
    data: { notas: notas || null },
  });

  res.json({ notas: actualizado.notas || "" });
}

module.exports = { obtenerNotas, guardarNotas };
