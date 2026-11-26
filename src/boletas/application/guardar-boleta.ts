import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from '../../categorias/application/categoria.repository.js';
import type { Categoria } from '../../categorias/domain/categoria.js';
import {
  ValidacionError,
  ValidacionFilaError,
} from '../../compartido/errores.js';
import { validarImagen } from '../../compartido/imagen.js';
import { Monto } from '../../compartido/monto.js';
import {
  ALMACEN_DE_ARCHIVOS,
  type AlmacenDeArchivos,
} from '../../compartido/almacenamiento/almacen-de-archivos.js';
import {
  validarCategoria,
  validarDescripcion,
  validarFecha,
} from '../../transacciones/domain/transaccion.js';
import {
  BOLETA_REPOSITORY,
  type BoletaRepository,
  type GastoDeBoleta,
} from './boleta.repository.js';

const MAX_COMERCIO = 100;
const MAX_PRODUCTOS = 100;
const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export interface DatosGuardarBoleta {
  comercio: string;
  fecha: string;
  totalImpreso: string | null;
  productos: { descripcion: string; monto: string; categoriaId: string | null }[];
}

@Injectable()
export class GuardarBoleta {
  private readonly logger = new Logger(GuardarBoleta.name);

  constructor(
    @Inject(BOLETA_REPOSITORY) private readonly repo: BoletaRepository,
    @Inject(ALMACEN_DE_ARCHIVOS) private readonly almacen: AlmacenDeArchivos,
    @Inject(CATEGORIA_REPOSITORY)
    private readonly categorias: CategoriaRepository,
  ) {}

  // `zonaHoraria` no se usa (la fecha viene de la boleta); se conserva en la
  // firma por consistencia con los demás casos de uso.
  async ejecutar(
    userId: string,
    zonaHoraria: string,
    bytes: Uint8Array,
    datos: DatosGuardarBoleta,
  ): Promise<{ id: string; gastosCreados: number }> {
    void zonaHoraria;
    // Todo se valida antes de subir nada.
    const imagen = validarImagen(bytes);
    const comercio = datos.comercio.trim();
    if (comercio.length < 1 || comercio.length > MAX_COMERCIO)
      throw new ValidacionError(
        `El comercio debe tener entre 1 y ${MAX_COMERCIO} caracteres`,
        'COMERCIO_INVALIDO',
      );
    const fecha = validarFecha(datos.fecha);
    const totalImpreso =
      datos.totalImpreso === null ? null : Monto.desdeTexto(datos.totalImpreso);
    if (datos.productos.length < 1 || datos.productos.length > MAX_PRODUCTOS)
      throw new ValidacionError(
        `La boleta debe tener entre 1 y ${MAX_PRODUCTOS} productos`,
        'PRODUCTOS_INVALIDOS',
      );

    const propias = new Map<string, Promise<Categoria | null>>();
    const gastos: GastoDeBoleta[] = [];
    for (const [i, p] of datos.productos.entries()) {
      try {
        const descripcion = validarDescripcion(p.descripcion);
        const monto = Monto.desdeTexto(p.monto);
        if (p.categoriaId !== null) {
          let c = propias.get(p.categoriaId);
          if (!c) {
            c = this.categorias.obtener(userId, p.categoriaId);
            propias.set(p.categoriaId, c);
          }
          validarCategoria(await c, 'gasto');
        }
        gastos.push({ descripcion, monto, categoriaId: p.categoriaId });
      } catch (e) {
        if (e instanceof ValidacionError) throw new ValidacionFilaError(i, e);
        throw e;
      }
    }

    const ruta = `${userId}/${randomUUID()}.${EXTENSION[imagen.mediaType]}`;
    await this.almacen.guardar(ruta, imagen.bytes, imagen.mediaType);
    try {
      return await this.repo.crearConGastos(userId, {
        rutaImagen: ruta,
        comercio,
        fecha,
        totalImpreso,
        gastos,
      });
    } catch (e) {
      try {
        await this.almacen.eliminar(ruta);
      } catch {
        this.logger.warn('No se pudo limpiar la imagen de una boleta no guardada');
      }
      throw e;
    }
  }
}
