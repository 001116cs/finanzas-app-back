import { Inject, Injectable } from '@nestjs/common';
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
  type TransaccionRepository,
} from './transaccion.repository.js';

@Injectable()
export class CrearTransaccion {
  constructor(
    @Inject(TRANSACCION_REPOSITORY)
    private readonly repo: TransaccionRepository,
    @Inject(CATEGORIA_REPOSITORY)
    private readonly categorias: CategoriaRepository,
  ) {}

  async ejecutar(
    userId: string,
    datos: {
      tipo: TipoMovimiento;
      monto: string;
      fecha: string;
      descripcion: string;
      categoriaId: string | null;
    },
  ): Promise<Transaccion> {
    const monto = Monto.desdeTexto(datos.monto);
    const fecha = validarFecha(datos.fecha);
    const descripcion = validarDescripcion(datos.descripcion);
    if (datos.categoriaId !== null)
      validarCategoria(
        await this.categorias.obtener(userId, datos.categoriaId),
        datos.tipo,
      );
    return this.repo.crear(userId, {
      tipo: datos.tipo,
      monto,
      fecha,
      descripcion,
      categoriaId: datos.categoriaId,
    });
  }
}
