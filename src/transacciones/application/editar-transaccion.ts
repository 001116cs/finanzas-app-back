import { Inject, Injectable } from '@nestjs/common';
import { NoEncontradoError } from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from '../../categorias/application/categoria.repository.js';
import {
  validarCategoria,
  validarDescripcion,
  validarFecha,
  type Transaccion,
} from '../domain/transaccion.js';
import {
  TRANSACCION_REPOSITORY,
  type DatosTransaccion,
  type TransaccionRepository,
} from './transaccion.repository.js';

export interface CambiosTransaccion {
  tipo?: TipoMovimiento;
  monto?: string;
  fecha?: string;
  descripcion?: string;
  /** null quita la categoría; undefined la deja igual. */
  categoriaId?: string | null;
}

@Injectable()
export class EditarTransaccion {
  constructor(
    @Inject(TRANSACCION_REPOSITORY)
    private readonly repo: TransaccionRepository,
    @Inject(CATEGORIA_REPOSITORY)
    private readonly categorias: CategoriaRepository,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
    c: CambiosTransaccion,
  ): Promise<Transaccion> {
    const actual = await this.repo.obtener(userId, id);
    if (!actual) throw new NoEncontradoError('Transacción no encontrada');

    const cambios: Partial<DatosTransaccion> = {};
    if (c.tipo !== undefined) cambios.tipo = c.tipo;
    if (c.monto !== undefined) cambios.monto = Monto.desdeTexto(c.monto);
    if (c.fecha !== undefined) cambios.fecha = validarFecha(c.fecha);
    if (c.descripcion !== undefined)
      cambios.descripcion = validarDescripcion(c.descripcion);
    if (c.categoriaId !== undefined) cambios.categoriaId = c.categoriaId;

    const tipo = cambios.tipo ?? actual.tipo;
    const categoriaId =
      c.categoriaId !== undefined ? c.categoriaId : actual.categoriaId;
    if (categoriaId !== null)
      validarCategoria(
        await this.categorias.obtener(userId, categoriaId),
        tipo,
      );

    const nueva = await this.repo.actualizar(userId, id, cambios);
    if (!nueva) throw new NoEncontradoError('Transacción no encontrada');
    return nueva;
  }
}
