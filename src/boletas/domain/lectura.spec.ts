import { describe, expect, it } from 'vitest';
import { normalizarLectura, type LecturaCruda } from './lectura.js';

const categorias = [
  { id: 'c1', nombre: 'Comida' },
  { id: 'c2', nombre: 'Hogar' },
];

function cruda(parcial: Partial<LecturaCruda> = {}): LecturaCruda {
  return {
    esBoleta: true,
    comercio: 'Tienda',
    fecha: '2026-11-20',
    totalImpreso: 10,
    productos: [{ descripcion: 'Leche', monto: 4.5, categoria: 'Comida' }],
    ...parcial,
  };
}

describe('normalizarLectura', () => {
  it('normaliza una lectura válida', () => {
    expect(normalizarLectura(cruda(), categorias)).toEqual({
      comercio: 'Tienda',
      fecha: '2026-11-20',
      totalImpreso: '10.00',
      productos: [{ descripcion: 'Leche', monto: '4.50', categoriaId: 'c1' }],
    });
  });

  it('mapea categorías sin distinguir mayúsculas ni espacios', () => {
    const r = normalizarLectura(
      cruda({
        productos: [{ descripcion: 'A', monto: 1, categoria: '  hOGAR ' }],
      }),
      categorias,
    );
    expect(r?.productos[0].categoriaId).toBe('c2');
  });

  it('categoría desconocida o null → null', () => {
    const r = normalizarLectura(
      cruda({
        productos: [
          { descripcion: 'A', monto: 1, categoria: 'Otra' },
          { descripcion: 'B', monto: 1, categoria: null },
        ],
      }),
      categorias,
    );
    expect(r?.productos.map((p) => p.categoriaId)).toEqual([null, null]);
  });

  it('fecha inválida → null', () => {
    expect(
      normalizarLectura(cruda({ fecha: '2026-02-30' }), categorias)?.fecha,
    ).toBeNull();
    expect(
      normalizarLectura(cruda({ fecha: null }), categorias)?.fecha,
    ).toBeNull();
  });

  it('conserva el signo de los montos negativos', () => {
    const r = normalizarLectura(
      cruda({
        productos: [{ descripcion: 'Desc', monto: -3, categoria: null }],
      }),
      categorias,
    );
    expect(r?.productos[0].monto).toBe('-3.00');
  });

  it('redondea sin acumular errores de float', () => {
    const r = normalizarLectura(
      cruda({
        productos: [{ descripcion: 'A', monto: 0.1 + 0.2, categoria: null }],
      }),
      categorias,
    );
    expect(r?.productos[0].monto).toBe('0.30');
  });

  it('descarta productos con descripción vacía o monto no finito', () => {
    const r = normalizarLectura(
      cruda({
        productos: [
          { descripcion: '   ', monto: 1, categoria: null },
          { descripcion: 'X', monto: Number.NaN, categoria: null },
          { descripcion: 'Ok', monto: 2, categoria: null },
        ],
      }),
      categorias,
    );
    expect(r?.productos).toHaveLength(1);
    expect(r?.productos[0].descripcion).toBe('Ok');
  });

  it('sin productos → null', () => {
    expect(normalizarLectura(cruda({ productos: [] }), categorias)).toBeNull();
  });

  it('esBoleta=false → null', () => {
    expect(
      normalizarLectura(cruda({ esBoleta: false }), categorias),
    ).toBeNull();
  });

  it('comercio vacío → "Comercio sin nombre"', () => {
    expect(
      normalizarLectura(cruda({ comercio: '  ' }), categorias)?.comercio,
    ).toBe('Comercio sin nombre');
  });

  it('trunca comercio y descripciones', () => {
    const r = normalizarLectura(
      cruda({
        comercio: 'a'.repeat(150),
        productos: [
          { descripcion: 'b'.repeat(300), monto: 1, categoria: null },
        ],
      }),
      categorias,
    );
    expect(r?.comercio).toHaveLength(100);
    expect(r?.productos[0].descripcion).toHaveLength(200);
  });

  it('totalImpreso null si no finito o ≤ 0', () => {
    for (const t of [null, Number.NaN, 0, -5, Infinity]) {
      expect(
        normalizarLectura(cruda({ totalImpreso: t }), categorias)?.totalImpreso,
      ).toBeNull();
    }
  });
});
