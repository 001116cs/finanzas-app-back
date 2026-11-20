import { Inject, Injectable } from '@nestjs/common';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import { validarNombre, type Categoria } from '../domain/categoria.js';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from './categoria.repository.js';

@Injectable()
export class CrearCategoria {
  constructor(
    @Inject(CATEGORIA_REPOSITORY) private readonly repo: CategoriaRepository,
  ) {}

  async ejecutar(
    userId: string,
    datos: { nombre: string; tipo: TipoMovimiento },
  ): Promise<Categoria> {
    return this.repo.crear(userId, {
      nombre: validarNombre(datos.nombre),
      tipo: datos.tipo,
    });
  }
}
