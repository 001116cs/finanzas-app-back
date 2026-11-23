import { ValidacionFilaError } from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import { claveDuplicado, MAX_FILAS_LOTE } from '../domain/fila-importada.js';
import { BuscarDuplicados } from './buscar-duplicados.js';
import type { ImportacionRepository } from './importacion.repository.js';

const AHORA = new Date('2026-11-22T15:00:00Z');
const reloj = { ahora: () => AHORA };
const fila = (over: object = {}) => ({
  fecha: '2026-11-02' as string | null,
  descripcion: 'Café',
  monto: '4.50',
  tipo: 'gasto' as const,
  ...over,
});

function caso(existentes: string[] = []) {
  const llamadas: unknown[][] = [];
  const repo = {
    async clavesExistentes(_u: string, filas: unknown[]) {
      llamadas.push(filas);
      return new Set(existentes);
    },
  } as unknown as ImportacionRepository;
  return { uc: new BuscarDuplicados(repo, reloj), llamadas };
}
const clave = (f: {
  fecha: string;
  monto: string;
  tipo: 'gasto' | 'ingreso';
  descripcion: string;
}) => claveDuplicado({ ...f, monto: Monto.desdeTexto(f.monto) });

describe('BuscarDuplicados', () => {
  it('devuelve índices ascendentes de filas cuya clave existe, con una sola consulta', async () => {
    const { uc, llamadas } = caso([
      clave({ ...fila(), fecha: '2026-11-02' } as never),
    ]);
    const r = await uc.ejecutar('u', 'America/Lima', [
      fila({ descripcion: 'otra' }),
      fila({ descripcion: ' CAFÉ ' }),
      fila(),
    ]);
    expect(r).toEqual([1, 2]);
    expect(llamadas).toHaveLength(1);
  });

  it('fecha null usa hoy en la zona del perfil', async () => {
    const hoyLima = '2026-11-22';
    const { uc } = caso([clave({ ...fila(), fecha: hoyLima } as never)]);
    expect(
      await uc.ejecutar('u', 'America/Lima', [fila({ fecha: null })]),
    ).toEqual([0]);
    // 15:00Z en Auckland ya es 23/11
    expect(
      await uc.ejecutar('u', 'Pacific/Auckland', [fila({ fecha: null })]),
    ).toEqual([]);
  });

  it('filas repetidas entre sí no cuentan', async () => {
    const { uc } = caso();
    expect(await uc.ejecutar('u', 'America/Lima', [fila(), fila()])).toEqual(
      [],
    );
  });

  it('0 filas -> LOTE_VACIO; más del máximo -> LOTE_DEMASIADO_GRANDE', async () => {
    const { uc } = caso();
    await expect(uc.ejecutar('u', 'America/Lima', [])).rejects.toMatchObject({
      codigo: 'LOTE_VACIO',
    });
    await expect(
      uc.ejecutar(
        'u',
        'America/Lima',
        Array.from({ length: MAX_FILAS_LOTE + 1 }, () => fila()),
      ),
    ).rejects.toMatchObject({ codigo: 'LOTE_DEMASIADO_GRANDE' });
  });

  it('fila inválida -> ValidacionFilaError con su índice', async () => {
    const { uc } = caso();
    const e = await uc
      .ejecutar('u', 'America/Lima', [fila(), fila({ monto: 'abc' })])
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ValidacionFilaError);
    expect((e as ValidacionFilaError).fila).toBe(1);
  });
});
