import { Inject, Injectable } from '@nestjs/common';
import { NoEncontradoError } from '../../compartido/errores.js';
import { validarNombre, type CategoriaConConteo } from '../domain/categoria.js';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from './categoria.repository.js';

@Injectable()
export class RenombrarCategoria {
  constructor(
    @Inject(CATEGORIA_REPOSITORY) private readonly repo: CategoriaRepository,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
    nombre: string,
  ): Promise<CategoriaConConteo> {
    const limpio = validarNombre(nombre);
    if (!(await this.repo.obtener(userId, id)))
      throw new NoEncontradoError('Categoría no encontrada');
    const c = await this.repo.renombrar(userId, id, limpio);
    return {
      ...c,
      cantidadMovimientos: await this.repo.contarMovimientos(userId, id),
    };
  }
}
