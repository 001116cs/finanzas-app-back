import { Inject, Injectable } from '@nestjs/common';
import {
  NoEncontradoError,
  ValidacionError,
} from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import { validarFecha } from '../../transacciones/domain/transaccion.js';
import {
  BOLETA_REPOSITORY,
  type BoletaRepository,
  type CambiosBoleta,
} from './boleta.repository.js';

const MAX_COMERCIO = 100;

export interface DatosEditarBoleta {
  comercio?: string;
  fecha?: string;
  totalImpreso?: string | null;
}

@Injectable()
export class EditarBoleta {
  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
    datos: DatosEditarBoleta,
  ): Promise<void> {
    const cambios: CambiosBoleta = {};
    if (datos.comercio !== undefined) {
      const comercio = datos.comercio.trim();
      if (comercio.length < 1 || comercio.length > MAX_COMERCIO)
        throw new ValidacionError(
          `El comercio debe tener entre 1 y ${MAX_COMERCIO} caracteres`,
          'COMERCIO_INVALIDO',
        );
      cambios.comercio = comercio;
    }
    if (datos.fecha !== undefined) cambios.fecha = validarFecha(datos.fecha);
    if (datos.totalImpreso !== undefined)
      cambios.totalImpreso =
        datos.totalImpreso === null
          ? null
          : Monto.desdeTexto(datos.totalImpreso);
    if (Object.keys(cambios).length === 0)
      throw new ValidacionError('No hay cambios que aplicar', 'VALIDACION');
    const ok = await this.repo.actualizarCabecera(userId, id, cambios);
    if (!ok) throw new NoEncontradoError('Boleta no encontrada');
  }
}
