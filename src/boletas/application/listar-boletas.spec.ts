import { ValidacionError } from '../../compartido/errores.js';
import { ListarBoletas } from './listar-boletas.js';

const crear = () => {
  const repo = { listar: vi.fn().mockResolvedValue({ items: [], total: 0 }) };
  return { repo, uc: new ListarBoletas(repo as never) };
};

describe('ListarBoletas', () => {
  it('defaults 1 y 12', async () => {
    const { uc, repo } = crear();
    await uc.ejecutar('u');
    expect(repo.listar).toHaveBeenCalledWith('u', 1, 12);
  });
  it('pasa pagina y tamano', async () => {
    const { uc, repo } = crear();
    await uc.ejecutar('u', 3, 50);
    expect(repo.listar).toHaveBeenCalledWith('u', 3, 50);
  });
  it('pagina 0, tamano 0 o 51: error', async () => {
    const { uc, repo } = crear();
    await expect(uc.ejecutar('u', 0, 12)).rejects.toBeInstanceOf(
      ValidacionError,
    );
    await expect(uc.ejecutar('u', 1, 51)).rejects.toBeInstanceOf(
      ValidacionError,
    );
    await expect(uc.ejecutar('u', 1, 0)).rejects.toBeInstanceOf(
      ValidacionError,
    );
    expect(repo.listar).not.toHaveBeenCalled();
  });
});
