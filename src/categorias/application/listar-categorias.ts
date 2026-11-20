import { Inject, Injectable } from '@nestjs/common';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { CategoriaConConteo } from '../domain/categoria.js';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from './categoria.repository.js';

@Injectable()
export class ListarCategorias {
  constructor(
    @Inject(CATEGORIA_REPOSITORY) private readonly repo: CategoriaRepository,
  ) {}

  ejecutar(
    userId: string,
    tipo?: TipoMovimiento,
  ): Promise<CategoriaConConteo[]> {
    return this.repo.listar(userId, tipo);
  }
}
