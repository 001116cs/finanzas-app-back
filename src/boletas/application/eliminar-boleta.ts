import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ALMACEN_DE_ARCHIVOS,
  type AlmacenDeArchivos,
} from '../../compartido/almacenamiento/almacen-de-archivos.js';
import { NoEncontradoError } from '../../compartido/errores.js';
import { BOLETA_REPOSITORY, type BoletaRepository } from './boleta.repository.js';

export type ModoEliminarBoleta = 'conservar' | 'eliminar';

@Injectable()
export class EliminarBoleta {
  private readonly logger = new Logger(EliminarBoleta.name);

  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
    @Inject(ALMACEN_DE_ARCHIVOS) private readonly almacen: AlmacenDeArchivos,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
    modo: ModoEliminarBoleta = 'conservar',
  ): Promise<void> {
    const ruta =
      modo === 'eliminar'
        ? await this.repo.eliminarConGastos(userId, id)
        : await this.repo.eliminar(userId, id);
    if (ruta === null) throw new NoEncontradoError('Boleta no encontrada');
    try {
      await this.almacen.eliminar(ruta);
    } catch {
      this.logger.warn('No se pudo borrar la imagen de una boleta');
    }
  }
}
