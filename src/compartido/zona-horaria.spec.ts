import { esZonaHorariaValida } from './zona-horaria.js';

describe('esZonaHorariaValida', () => {
  it.each(['UTC', 'Etc/UTC', 'America/Lima'])('acepta %s', (z) => {
    expect(esZonaHorariaValida(z)).toBe(true);
  });
  it.each(['Mars/Base', '', 'abc'])('rechaza "%s"', (z) => {
    expect(esZonaHorariaValida(z)).toBe(false);
  });
});
