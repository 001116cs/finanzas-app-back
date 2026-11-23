import { ConflictoError } from '../../compartido/errores.js';
import { DrizzleImportacionRepository } from './drizzle-importacion.repository.js';

/** tx falso: el insert de categoría no hace nada y la consulta de reutilización no encuentra fila. */
function dbSinCategoria() {
  const tx = {
    insert: () => ({
      values: () => ({ onConflictDoNothing: () => Promise.resolve() }),
    }),
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
  };
  return {
    transaction: <T>(cb: (t: typeof tx) => Promise<T>) => cb(tx),
  };
}

describe('DrizzleImportacionRepository.guardar', () => {
  it('si la categoría nueva no se puede reutilizar ni crear, lanza un error de dominio (no un TypeError)', async () => {
    const repo = new DrizzleImportacionRepository(dbSinCategoria() as never);
    const promesa = repo.guardar('u', {
      nombreArchivo: 'a.csv',
      categoriasNuevas: [{ nombre: 'Mascotas', tipo: 'gasto' }],
      filas: [],
    } as never);
    await expect(promesa).rejects.toBeInstanceOf(ConflictoError);
    await expect(promesa).rejects.toMatchObject({
      codigo: 'CATEGORIA_NO_DISPONIBLE',
    });
  });
});
