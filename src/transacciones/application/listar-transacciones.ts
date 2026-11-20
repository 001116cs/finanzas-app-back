import { Inject, Injectable } from '@nestjs/common';
import { validarFecha, type Transaccion } from '../domain/transaccion.js';
import {
  TRANSACCION_REPOSITORY,
  type FiltrosTransaccion,
  type TransaccionRepository,
} from './transaccion.repository.js';

@Injectable()
export class ListarTransacciones {
  constructor(
    @Inject(TRANSACCION_REPOSITORY)
    private readonly repo: TransaccionRepository,
  ) {}

  async ejecutar(
    userId: string,
    filtros: FiltrosTransaccion,
  ): Promise<{ items: Transaccion[]; total: number }> {
    if (filtros.desde !== undefined) validarFecha(filtros.desde);
    if (filtros.hasta !== undefined) validarFecha(filtros.hasta);
    return this.repo.listar(userId, filtros);
  }
}
