import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from '../../categorias/application/categoria.repository.js';
import { BoletaIlegibleError } from '../../compartido/errores.js';
import { validarImagen } from '../../compartido/imagen.js';
import { RegistrarUsoBoleta } from '../../uso-ia/application/registrar-uso-boleta.js';
import { ReservarCupoBoleta } from '../../uso-ia/application/reservar-cupo-boleta.js';
import { normalizarLectura, type LecturaBoleta } from '../domain/lectura.js';
import {
  LECTOR_DE_BOLETAS,
  type LectorDeBoletas,
} from './lector-de-boletas.js';

@Injectable()
export class EscanearBoleta {
  constructor(
    @Inject(LECTOR_DE_BOLETAS) private readonly lector: LectorDeBoletas,
    private readonly reservarCupo: ReservarCupoBoleta,
    private readonly registrar: RegistrarUsoBoleta,
    @Inject(CATEGORIA_REPOSITORY)
    private readonly categorias: CategoriaRepository,
  ) {}

  private readonly logger = new Logger(EscanearBoleta.name);

  async ejecutar(
    userId: string,
    zonaHoraria: string,
    bytes: Uint8Array,
  ): Promise<LecturaBoleta> {
    const imagen = validarImagen(bytes);
    const { mes } = await this.reservarCupo.ejecutar(userId, zonaHoraria);

    let gastos;
    let resultado;
    try {
      gastos = await this.categorias.listar(userId, 'gasto');
      resultado = await this.lector.leer(
        imagen,
        gastos.map((c) => c.nombre),
      );
    } catch (e) {
      // IA caída o error inesperado: se devuelve la reserva sin costo ni fallo.
      try {
        await this.registrar.cancelar(userId, mes);
      } catch {
        this.logger.error('No se pudo liberar la reserva de cupo de IA');
      }
      throw e;
    }

    if (resultado.tipo === 'ok') {
      const lectura = normalizarLectura(
        resultado.cruda,
        gastos.map((c) => ({ id: c.id, nombre: c.nombre })),
      );
      if (lectura) {
        try {
          await this.registrar.exito(mes, resultado.uso);
        } catch {
          this.logger.error(
            'No se pudo registrar el uso de IA de una boleta leída',
          );
        }
        return lectura;
      }
    }
    try {
      await this.registrar.fallo(userId, mes, resultado.uso);
    } catch {
      this.logger.error('No se pudo registrar el intento fallido de IA');
    }
    throw new BoletaIlegibleError();
  }
}
