// Redondea a 2 decimales para evitar el arrastre de imprecisión de punto
// flotante al sumar montos (ej. 0.1 + 0.2 en JS).
function redondear(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

module.exports = { redondear };
