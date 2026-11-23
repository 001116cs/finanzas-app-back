import { Inject, Injectable } from '@nestjs/common';
import {
  IMPORTACION_REPOSITORY,
  type Importacion,
  type ImportacionRepository,
} from './importacion.repository.js';

@Injectable()
export class ListarImportaciones {
  constructor(
    @Inject(IMPORTACION_REPOSITORY)
    private readonly repo: ImportacionRepository,
  ) {}

  ejecutar(userId: string): Promise<Importacion[]> {
    return this.repo.listar(userId);
  }
}
