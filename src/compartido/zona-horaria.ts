/** Válida si el runtime puede usarla como timeZone (acepta "UTC", "Etc/UTC", etc.). */
export function esZonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}
