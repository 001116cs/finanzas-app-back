import { Inject, Injectable } from '@nestjs/common';
import {
  ALMACEN_DE_ARCHIVOS,
  type AlmacenDeArchivos,
} from '../../compartido/almacenamiento/almacen-de-archivos.js';
import { NoEncontradoError } from '../../compartido/errores.js';
import { BOLETA_REPOSITORY, type BoletaRepository } from './boleta.repository.js';

@Injectable()
export class ObtenerImagenBoleta {
  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
    @Inject(ALMACEN_DE_ARCHIVOS) private readonly almacen: AlmacenDeArchivos,
  ) {}

  async ejecutar(
    userId: string,
    id: string,
  ): Promise<{ bytes: Uint8Array; contentType: string }> {
    const b = await this.repo.obtener(userId, id);
    if (!b) throw new NoEncontradoError('Boleta no encontrada');
    const imagen = await this.almacen.leer(b.rutaImagen);
    if (!imagen) throw new NoEncontradoError('Imagen no encontrada');
    return imagen;
  }
}
