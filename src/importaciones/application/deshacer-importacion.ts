import { Inject, Injectable } from '@nestjs/common';
import { NoEncontradoError } from '../../compartido/errores.js';
import {
  IMPORTACION_REPOSITORY,
  type ImportacionRepository,
} from './importacion.repository.js';

@Injectable()
export class DeshacerImportacion {
  constructor(
    @Inject(IMPORTACION_REPOSITORY)
    private readonly repo: ImportacionRepository,
  ) {}

  async ejecutar(userId: string, id: string): Promise<void> {
    if (!(await this.repo.eliminar(userId, id)))
      throw new NoEncontradoError('Importación no encontrada');
  }
}
