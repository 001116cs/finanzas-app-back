import { NoEncontradoError } from '../../compartido/errores.js';
import { EliminarBoleta } from './eliminar-boleta.js';

const crear = (ruta: string | null = 'ruta/img.jpg') => {
  const repo = {
    eliminar: vi.fn().mockResolvedValue(ruta),
    eliminarConGastos: vi.fn().mockResolvedValue(ruta),
  };
  const almacen = { eliminar: vi.fn().mockResolvedValue(undefined) };
  return {
    repo,
    almacen,
    uc: new EliminarBoleta(repo as never, almacen as never),
  };
};

describe('EliminarBoleta', () => {
  it('modo eliminar: usa eliminarConGastos y no eliminar', async () => {
    const { uc, repo, almacen } = crear();
    await uc.ejecutar('u', 'b', 'eliminar');
    expect(repo.eliminarConGastos).toHaveBeenCalledWith('u', 'b');
    expect(repo.eliminar).not.toHaveBeenCalled();
    expect(almacen.eliminar).toHaveBeenCalledWith('ruta/img.jpg');
  });
  it('por defecto: usa eliminar y no eliminarConGastos', async () => {
    const { uc, repo } = crear();
    await uc.ejecutar('u', 'b');
    expect(repo.eliminar).toHaveBeenCalledWith('u', 'b');
    expect(repo.eliminarConGastos).not.toHaveBeenCalled();
  });
  it('null: NoEncontradoError y almacén no llamado', async () => {
    for (const modo of ['conservar', 'eliminar'] as const) {
      const { uc, almacen } = crear(null);
      await expect(uc.ejecutar('u', 'b', modo)).rejects.toBeInstanceOf(
        NoEncontradoError,
      );
      expect(almacen.eliminar).not.toHaveBeenCalled();
    }
  });
  it('fallo del almacén: no lanza', async () => {
    const { uc, almacen } = crear();
    almacen.eliminar.mockRejectedValue(new Error('disco'));
    await expect(uc.ejecutar('u', 'b', 'eliminar')).resolves.toBeUndefined();
  });
});
