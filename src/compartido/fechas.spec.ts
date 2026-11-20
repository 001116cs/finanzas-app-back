import { fechaEnZona, rangoMesActual, rangoMesAnterior } from './fechas.js';

describe('fechas', () => {
  it('fechaEnZona usa la zona dada', () => {
    const t = new Date('2026-12-01T03:00:00Z');
    expect(fechaEnZona(t, 'America/Lima')).toBe('2026-11-30');
    expect(fechaEnZona(t, 'UTC')).toBe('2026-12-01');
  });

  it('rangoMesActual respeta la zona horaria', () => {
    const t = new Date('2026-12-01T03:00:00Z');
    expect(rangoMesActual(t, 'America/Lima')).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-30',
    });
    expect(rangoMesActual(t, 'UTC')).toEqual({
      desde: '2026-12-01',
      hasta: '2026-12-31',
    });
  });

  it('febrero de 2028 termina el 29', () => {
    expect(rangoMesActual(new Date('2028-02-10T12:00:00Z'), 'UTC')).toEqual({
      desde: '2028-02-01',
      hasta: '2028-02-29',
    });
  });

  it('rangoMesAnterior desde enero es diciembre del año anterior', () => {
    expect(rangoMesAnterior(new Date('2027-01-15T12:00:00Z'), 'UTC')).toEqual({
      desde: '2026-12-01',
      hasta: '2026-12-31',
    });
    expect(rangoMesAnterior(new Date('2026-03-15T12:00:00Z'), 'UTC')).toEqual({
      desde: '2026-02-01',
      hasta: '2026-02-28',
    });
  });
});
