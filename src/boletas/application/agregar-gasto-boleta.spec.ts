import {
  NoEncontradoError,
  ValidacionError,
} from '../../compartido/errores.js';
import { AgregarGastoBoleta } from './agregar-gasto-boleta.js';

const cat = (tipo: string) => ({ id: 'c1', tipo });
const crear = (
  repoRes: unknown = { id: 't' },
  categoria: unknown = cat('gasto'),
) => {
  const repo = { agregarGasto: vi.fn().mockResolvedValue(repoRes) };
  const categorias = { obtener: vi.fn().mockResolvedValue(categoria) };
  return {
    repo,
    categorias,
    uc: new AgregarGastoBoleta(repo as never, categorias as never),
  };
};
const codigo = async (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: ValidacionError) => e.codigo,
  );
const d = (over: object = {}) => ({
  descripcion: 'Pan',
  monto: '3.00',
  categoriaId: null,
  ...over,
});

describe('AgregarGastoBoleta', () => {
  it('monto 0 o -1: MONTO_INVALIDO', async () => {
    const { uc, repo } = crear();
    expect(await codigo(uc.ejecutar('u', 'b', d({ monto: '0' })))).toBe(
      'MONTO_INVALIDO',
    );
    expect(await codigo(uc.ejecutar('u', 'b', d({ monto: '-1' })))).toBe(
      'MONTO_INVALIDO',
    );
    expect(repo.agregarGasto).not.toHaveBeenCalled();
  });
  it('categoría ajena o de ingreso: CATEGORIA_INCOMPATIBLE', async () => {
    expect(
      await codigo(
        crear({ id: 't' }, null).uc.ejecutar(
          'u',
          'b',
          d({ categoriaId: 'c1' }),
        ),
      ),
    ).toBe('CATEGORIA_INCOMPATIBLE');
    expect(
      await codigo(
        crear({ id: 't' }, cat('ingreso')).uc.ejecutar(
          'u',
          'b',
          d({ categoriaId: 'c1' }),
        ),
      ),
    ).toBe('CATEGORIA_INCOMPATIBLE');
  });
  it('descripción vacía: error', async () => {
    expect(
      await codigo(crear().uc.ejecutar('u', 'b', d({ descripcion: ' ' }))),
    ).toBe('VALIDACION');
  });
  it('repo null: NoEncontradoError', async () => {
    await expect(crear(null).uc.ejecutar('u', 'b', d())).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
  });
  it('ok: pasa el gasto validado', async () => {
    const { uc, repo, categorias } = crear();
    const r = await uc.ejecutar(
      'u',
      'b',
      d({ descripcion: ' Pan ', categoriaId: 'c1' }),
    );
    expect(r).toEqual({ id: 't' });
    expect(categorias.obtener).toHaveBeenCalledWith('u', 'c1');
    const g = repo.agregarGasto.mock.calls[0][2];
    expect(g.descripcion).toBe('Pan');
    expect(g.monto.aTexto()).toBe('3.00');
    expect(g.categoriaId).toBe('c1');
  });
});
