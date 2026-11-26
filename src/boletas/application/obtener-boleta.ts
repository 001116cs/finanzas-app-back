import { Inject, Injectable } from '@nestjs/common';
import { NoEncontradoError } from '../../compartido/errores.js';
import {
  BOLETA_REPOSITORY,
  type Boleta,
  type BoletaRepository,
} from './boleta.repository.js';

export type BoletaPublica = Omit<Boleta, 'rutaImagen'>;

@Injectable()
export class ObtenerBoleta {
  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
  ) {}

  async ejecutar(userId: string, id: string): Promise<BoletaPublica> {
    const b = await this.repo.obtener(userId, id);
    if (!b) throw new NoEncontradoError('Boleta no encontrada');
    return {
      id: b.id,
      comercio: b.comercio,
      fecha: b.fecha,
      totalImpreso: b.totalImpreso,
      createdAt: b.createdAt,
    };
  }
}
