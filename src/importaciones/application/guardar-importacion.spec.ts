import { ValidacionFilaError } from '../../compartido/errores.js';
import type { CategoriaRepository } from '../../categorias/application/categoria.repository.js';
import { GuardarImportacion } from './guardar-importacion.js';
import type { ImportacionRepository } from './importacion.repository.js';

const AHORA = new Date('2026-11-22T15:00:00Z');
const reloj = { ahora: () => AHORA };
const fila = (over: object = {}) => ({
  fecha: '2026-11-02' as string | null,
  descripcion: 'Café',
  monto: '4.50',
  tipo: 'gasto' as const,
  categoriaId: null as string | null,
  categoriaNueva: null as string | null,
  ...over,
});

function caso(propias: Record<string, 'gasto' | 'ingreso'> = {}) {
  const guardados: unknown[] = [];
  const repo = {
    async guardar(_u: string, datos: unknown) {
      guardados.push(datos);
      return {
        id: 'i',
        nombreArchivo: 'a',
        filasImportadas: 1,
        createdAt: AHORA,
      };
    },
  } as unknown as ImportacionRepository;
  const categorias = {
    async obtener(_u: string, id: string) {
      return id in propias ? { id, nombre: 'x', tipo: propias[id] } : null;
    },
  } as unknown as CategoriaRepository;
  return { uc: new GuardarImportacion(repo, categorias, reloj), guardados };
}
const datos = (over: object = {}) => ({
  nombreArchivo: 'a.csv',
  categoriasNuevas: [] as { nombre: string; tipo: 'gasto' | 'ingreso' }[],
  filas: [fila()],
  ...over,
});

describe('GuardarImportacion', () => {
  it('guarda filas preparadas (fecha null = hoy en la zona del perfil)', async () => {
    const { uc, guardados } = caso();
    await uc.ejecutar(
      'u',
      'America/Lima',
      datos({ filas: [fila({ fecha: null })] }),
    );
    expect(guardados).toHaveLength(1);
    expect(
      (guardados[0] as { filas: { fecha: string }[] }).filas[0].fecha,
    ).toBe('2026-11-22');
  });

  it('0 filas -> LOTE_VACIO; demasiadas -> LOTE_DEMASIADO_GRANDE', async () => {
    const { uc } = caso();
    await expect(
      uc.ejecutar('u', 'America/Lima', datos({ filas: [] })),
    ).rejects.toMatchObject({ codigo: 'LOTE_VACIO' });
    await expect(
      uc.ejecutar(
        'u',
        'America/Lima',
        datos({ filas: Array.from({ length: 2001 }, () => fila()) }),
      ),
    ).rejects.toMatchObject({ codigo: 'LOTE_DEMASIADO_GRANDE' });
  });

  it('categoriaNueva no declarada o de otro tipo -> CATEGORIA_NUEVA_INVALIDA con fila', async () => {
    const { uc, guardados } = caso();
    const e = await uc
      .ejecutar(
        'u',
        'America/Lima',
        datos({ filas: [fila(), fila({ categoriaNueva: 'Mascotas' })] }),
      )
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ValidacionFilaError);
    expect(e).toMatchObject({ fila: 1, codigo: 'CATEGORIA_NUEVA_INVALIDA' });
    await expect(
      uc.ejecutar(
        'u',
        'America/Lima',
        datos({
          categoriasNuevas: [{ nombre: 'Mascotas', tipo: 'ingreso' }],
          filas: [fila({ categoriaNueva: 'Mascotas' })],
        }),
      ),
    ).rejects.toMatchObject({ codigo: 'CATEGORIA_NUEVA_INVALIDA' });
    expect(guardados).toHaveLength(0);
  });

  it('categoriaNueva coincide sin distinguir mayúsculas ni espacios', async () => {
    const { uc, guardados } = caso();
    await uc.ejecutar(
      'u',
      'America/Lima',
      datos({
        categoriasNuevas: [{ nombre: ' Mascotas ', tipo: 'gasto' }],
        filas: [fila({ categoriaNueva: 'mascotas' })],
      }),
    );
    expect(guardados).toHaveLength(1);
  });

  it('categoriaId ajena o de otro tipo -> CATEGORIA_INCOMPATIBLE con fila', async () => {
    const { uc } = caso({ c1: 'ingreso' });
    await expect(
      uc.ejecutar(
        'u',
        'America/Lima',
        datos({ filas: [fila({ categoriaId: 'c1' })] }),
      ),
    ).rejects.toMatchObject({ fila: 0, codigo: 'CATEGORIA_INCOMPATIBLE' });
    await expect(
      uc.ejecutar(
        'u',
        'America/Lima',
        datos({ filas: [fila({ categoriaId: 'zz' })] }),
      ),
    ).rejects.toMatchObject({ fila: 0, codigo: 'CATEGORIA_INCOMPATIBLE' });
  });

  it('nombre de categoría nueva inválido (vacío o >50) -> ValidacionError sin guardar', async () => {
    const { uc, guardados } = caso();
    for (const nombre of ['  ', 'x'.repeat(51)])
      await expect(
        uc.ejecutar(
          'u',
          'America/Lima',
          datos({ categoriasNuevas: [{ nombre, tipo: 'gasto' }] }),
        ),
      ).rejects.toMatchObject({ codigo: expect.any(String) });
    expect(guardados).toHaveLength(0);
  });

  it('categoriasNuevas repetidas se deduplican', async () => {
    const { uc, guardados } = caso();
    await uc.ejecutar(
      'u',
      'America/Lima',
      datos({
        categoriasNuevas: [
          { nombre: 'Mascotas', tipo: 'gasto' },
          { nombre: 'MASCOTAS', tipo: 'gasto' },
        ],
        filas: [fila({ categoriaNueva: 'Mascotas' })],
      }),
    );
    expect(
      (guardados[0] as { categoriasNuevas: unknown[] }).categoriasNuevas,
    ).toHaveLength(1);
  });

  it('ignora categoriasNuevas que ninguna fila referencia', async () => {
    const { uc, guardados } = caso();
    await uc.ejecutar(
      'u',
      'America/Lima',
      datos({
        categoriasNuevas: [
          { nombre: 'Mascotas', tipo: 'gasto' },
          { nombre: 'Sin uso', tipo: 'gasto' },
          { nombre: 'Mascotas', tipo: 'ingreso' },
        ],
        filas: [fila({ categoriaNueva: 'mascotas' })],
      }),
    );
    expect(
      (guardados[0] as { categoriasNuevas: unknown[] }).categoriasNuevas,
    ).toEqual([{ nombre: 'Mascotas', tipo: 'gasto' }]);
  });
});
