import { Inject, Injectable } from '@nestjs/common';
import { ValidacionError } from '../../compartido/errores.js';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
  type ModoEliminacion,
} from './categoria.repository.js';

@Injectable()
export class EliminarCategoria {
  constructor(
    @Inject(CATEGORIA_REPOSITORY) private readonly repo: CategoriaRepository,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
    modo?: ModoEliminacion,
    destinoId?: string,
  ): Promise<void> {
    if (modo === 'mover' && (!destinoId || destinoId === id))
      throw new ValidacionError(
        'Indica una categoría destino distinta',
        'DESTINO_INVALIDO',
      );
    await this.repo.eliminar(userId, id, modo ?? null, destinoId);
  }
}
