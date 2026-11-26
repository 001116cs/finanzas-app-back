import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from '../../categorias/application/categoria.repository.js';
import { NoEncontradoError } from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import {
  validarCategoria,
  validarDescripcion,
  type Transaccion,
} from '../../transacciones/domain/transaccion.js';
import {
  BOLETA_REPOSITORY,
  type BoletaRepository,
} from './boleta.repository.js';

export interface DatosGastoBoleta {
  descripcion: string;
  monto: string;
  categoriaId: string | null;
}

@Injectable()
export class AgregarGastoBoleta {
  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
    @Inject(CATEGORIA_REPOSITORY)
    private readonly categorias: CategoriaRepository,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
    datos: DatosGastoBoleta,
  ): Promise<Transaccion> {
    const descripcion = validarDescripcion(datos.descripcion);
    const monto = Monto.desdeTexto(datos.monto);
    if (datos.categoriaId !== null)
      validarCategoria(
        await this.categorias.obtener(userId, datos.categoriaId),
        'gasto',
      );
    const t = await this.repo.agregarGasto(userId, id, {
      descripcion,
      monto,
      categoriaId: datos.categoriaId,
    });
    if (!t) throw new NoEncontradoError('Boleta no encontrada');
    return t;
  }
}
