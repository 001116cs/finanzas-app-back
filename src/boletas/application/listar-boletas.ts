import { Inject, Injectable } from '@nestjs/common';
import { ValidacionError } from '../../compartido/errores.js';
import {
  BOLETA_REPOSITORY,
  type BoletaRepository,
  type ResumenBoleta,
} from './boleta.repository.js';

const TAMANO_POR_DEFECTO = 12;
const TAMANO_MAX = 50;

@Injectable()
export class ListarBoletas {
  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
  ) {}

  async ejecutar(
    userId: string,
    pagina = 1,
    tamano = TAMANO_POR_DEFECTO,
  ): Promise<{ items: ResumenBoleta[]; total: number }> {
    if (!Number.isInteger(pagina) || pagina < 1)
      throw new ValidacionError('La página debe ser un entero >= 1');
    if (!Number.isInteger(tamano) || tamano < 1 || tamano > TAMANO_MAX)
      throw new ValidacionError(
        `El tamaño debe ser un entero entre 1 y ${TAMANO_MAX}`,
      );
    return this.repo.listar(userId, pagina, tamano);
  }
}
