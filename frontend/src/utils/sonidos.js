// Sonidos cortos generados con Web Audio (sin archivos de audio). El
// contexto se crea recien en el primer toque del usuario porque los
// navegadores de telefono no dejan sonar nada antes de una interaccion.
// Si el telefono esta en silencio, no suena — igual que cualquier web.
let audioCtx = null;

function contexto() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Llamar desde un click/tap para "despertar" el audio antes de usarlo.
export function activarAudio() {
  contexto();
}

// "Tic" seco y corto, como el trinquete del selector de fecha del iPhone.
export function tic() {
  const c = contexto();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.02);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.035);
}

// "Din" suave de dos notas al confirmar.
export function din() {
  const c = contexto();
  if (!c) return;
  const t = c.currentTime;
  for (const [freq, delay] of [[880, 0], [1320, 0.07]]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.12, t + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.18);
    osc.connect(gain).connect(c.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.2);
  }
}
