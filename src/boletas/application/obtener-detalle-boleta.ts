import { Inject, Injectable } from '@nestjs/common';
import { NoEncontradoError } from '../../compartido/errores.js';
import type { Transaccion } from '../../transacciones/domain/transaccion.js';
import {
  BOLETA_REPOSITORY,
  type BoletaRepository,
} from './boleta.repository.js';
import type { BoletaPublica } from './obtener-boleta.js';

export type DetalleBoleta = BoletaPublica & { gastos: Transaccion[] };

@Injectable()
export class ObtenerDetalleBoleta {
  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
  ) {}

  async ejecutar(userId: string, id: string): Promise<DetalleBoleta> {
    const b = await this.repo.obtener(userId, id);
    if (!b) throw new NoEncontradoError('Boleta no encontrada');
    const gastos = await this.repo.gastosDe(userId, id);
    return {
      id: b.id,
      comercio: b.comercio,
      fecha: b.fecha,
      totalImpreso: b.totalImpreso,
      createdAt: b.createdAt,
      gastos,
    };
  }
}
