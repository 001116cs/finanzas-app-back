import { Inject, Injectable } from '@nestjs/common';
import { NoEncontradoError } from '../../compartido/errores.js';
import {
  TRANSACCION_REPOSITORY,
  type TransaccionRepository,
} from './transaccion.repository.js';

@Injectable()
export class EliminarTransaccion {
  constructor(
    @Inject(TRANSACCION_REPOSITORY)
    private readonly repo: TransaccionRepository,
  ) {}

  async ejecutar(userId: string, id: string): Promise<void> {
    if (!(await this.repo.eliminar(userId, id)))
      throw new NoEncontradoError('Transacción no encontrada');
  }
}
