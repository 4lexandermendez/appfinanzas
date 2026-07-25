const ZONA_HORARIA = "America/El_Salvador";

// El dispositivo puede tener cualquier zona horaria (o el usuario puede
// estar viajando), pero la app siempre debe pensar en "hoy" como el día en
// El Salvador — si no, cerca de las 6pm hora local ya se salta al día
// siguiente por usar la fecha UTC/local del dispositivo directamente.
export function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
}

export function hoyAnioMes() {
  const [anio, mes] = hoyISO().split("-").map(Number);
  return { anio, mes };
}

export function anioActual() {
  return hoyAnioMes().anio;
}
