/** Fecha calendario (YYYY-MM-DD) de un instante en una zona IANA. */
export function fechaEnZona(ahora: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const valor = (t: string) => partes.find((p) => p.type === t)!.value;
  return `${valor('year').padStart(4, '0')}-${valor('month')}-${valor('day')}`;
}

export interface RangoFechas {
  desde: string;
  hasta: string;
}

function rangoMes(anio: number, mes: number): RangoFechas {
  // Normaliza meses fuera de 1..12 (p. ej. 0 = diciembre del año anterior).
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const ultimo = new Date(Date.UTC(anio, mes, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: iso(primero), hasta: iso(ultimo) };
}

function anioMes(ahora: Date, zona: string): [number, number] {
  const [a, m] = fechaEnZona(ahora, zona).split('-');
  return [Number(a), Number(m)];
}

export function rangoMesActual(ahora: Date, zona: string): RangoFechas {
  const [a, m] = anioMes(ahora, zona);
  return rangoMes(a, m);
}

export function rangoMesAnterior(ahora: Date, zona: string): RangoFechas {
  const [a, m] = anioMes(ahora, zona);
  return rangoMes(a, m - 1);
}
