import { ValidacionError } from '../../compartido/errores.js';
import type { CategoriaRepository } from './categoria.repository.js';
import { EliminarCategoria } from './eliminar-categoria.js';

function repoFalso() {
  const eliminar = vi.fn(async () => {});
  return { eliminar, repo: { eliminar } as unknown as CategoriaRepository };
}

describe('EliminarCategoria', () => {
  it('delega en el repositorio con modo null cuando no se indica', async () => {
    const { eliminar, repo } = repoFalso();
    await new EliminarCategoria(repo).ejecutar('u', 'c1');
    expect(eliminar).toHaveBeenCalledWith('u', 'c1', null, undefined);
  });

  it('delega modo y destino', async () => {
    const { eliminar, repo } = repoFalso();
    await new EliminarCategoria(repo).ejecutar('u', 'c1', 'mover', 'c2');
    expect(eliminar).toHaveBeenCalledWith('u', 'c1', 'mover', 'c2');
  });

  it('mover sin destino -> DESTINO_INVALIDO sin tocar el repo', async () => {
    const { eliminar, repo } = repoFalso();
    const p = new EliminarCategoria(repo).ejecutar('u', 'c1', 'mover');
    await expect(p).rejects.toBeInstanceOf(ValidacionError);
    await expect(p).rejects.toMatchObject({ codigo: 'DESTINO_INVALIDO' });
    expect(eliminar).not.toHaveBeenCalled();
  });

  it('mover hacia sí misma -> DESTINO_INVALIDO', async () => {
    const { eliminar, repo } = repoFalso();
    await expect(
      new EliminarCategoria(repo).ejecutar('u', 'c1', 'mover', 'c1'),
    ).rejects.toMatchObject({ codigo: 'DESTINO_INVALIDO' });
    expect(eliminar).not.toHaveBeenCalled();
  });
});
