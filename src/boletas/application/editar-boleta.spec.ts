import {
  NoEncontradoError,
  ValidacionError,
} from '../../compartido/errores.js';
import { EditarBoleta } from './editar-boleta.js';

const crear = (res = true) => {
  const repo = { actualizarCabecera: vi.fn().mockResolvedValue(res) };
  return { repo, uc: new EditarBoleta(repo as never) };
};
const codigo = async (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: ValidacionError) => e.codigo,
  );

describe('EditarBoleta', () => {
  it('comercio vacío o de 101 caracteres: COMERCIO_INVALIDO', async () => {
    const { uc } = crear();
    expect(await codigo(uc.ejecutar('u', 'b', { comercio: '   ' }))).toBe(
      'COMERCIO_INVALIDO',
    );
    expect(
      await codigo(uc.ejecutar('u', 'b', { comercio: 'x'.repeat(101) })),
    ).toBe('COMERCIO_INVALIDO');
  });
  it('fecha inválida: FECHA_INVALIDA', async () => {
    const { uc } = crear();
    expect(await codigo(uc.ejecutar('u', 'b', { fecha: '2026-02-30' }))).toBe(
      'FECHA_INVALIDA',
    );
  });
  it('sin campos: VALIDACION', async () => {
    const { uc, repo } = crear();
    expect(await codigo(uc.ejecutar('u', 'b', {}))).toBe('VALIDACION');
    expect(repo.actualizarCabecera).not.toHaveBeenCalled();
  });
  it('repo false: NoEncontradoError', async () => {
    const { uc } = crear(false);
    await expect(
      uc.ejecutar('u', 'b', { comercio: 'X' }),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
  it('ok: pasa valores normalizados y Monto', async () => {
    const { uc, repo } = crear();
    await uc.ejecutar('u', 'b', {
      comercio: ' Tienda ',
      fecha: '2026-03-01',
      totalImpreso: '10.5',
    });
    const [uid, id, c] = repo.actualizarCabecera.mock.calls[0];
    expect([uid, id]).toEqual(['u', 'b']);
    expect(c.comercio).toBe('Tienda');
    expect(c.fecha).toBe('2026-03-01');
    expect(c.totalImpreso.aTexto()).toBe('10.50');
  });
  it('totalImpreso null se conserva; monto inválido falla', async () => {
    const { uc, repo } = crear();
    await uc.ejecutar('u', 'b', { totalImpreso: null });
    expect(repo.actualizarCabecera.mock.calls[0][2]).toEqual({
      totalImpreso: null,
    });
    expect(await codigo(uc.ejecutar('u', 'b', { totalImpreso: '0' }))).toBe(
      'MONTO_INVALIDO',
    );
  });
});
