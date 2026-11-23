import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORIA_REPOSITORY,
  type CategoriaRepository,
} from '../../categorias/application/categoria.repository.js';
import type { Categoria } from '../../categorias/domain/categoria.js';
import { validarNombre } from '../../categorias/domain/categoria.js';
import {
  ValidacionError,
  ValidacionFilaError,
} from '../../compartido/errores.js';
import { fechaEnZona } from '../../compartido/fechas.js';
import { RELOJ, type Reloj } from '../../compartido/reloj.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import { validarCategoria } from '../../transacciones/domain/transaccion.js';
import {
  claveCategoriaNueva,
  MAX_FILAS_LOTE,
  prepararFila,
  type FilaEntrada,
} from '../domain/fila-importada.js';
import {
  IMPORTACION_REPOSITORY,
  type Importacion,
  type ImportacionRepository,
} from './importacion.repository.js';

@Injectable()
export class GuardarImportacion {
  constructor(
    @Inject(IMPORTACION_REPOSITORY)
    private readonly repo: ImportacionRepository,
    @Inject(CATEGORIA_REPOSITORY)
    private readonly categorias: CategoriaRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async ejecutar(
    userId: string,
    zonaHoraria: string,
    datos: {
      nombreArchivo: string;
      categoriasNuevas: { nombre: string; tipo: TipoMovimiento }[];
      filas: FilaEntrada[];
    },
  ): Promise<Importacion> {
    if (datos.filas.length === 0)
      throw new ValidacionError('El lote no tiene filas', 'LOTE_VACIO');
    if (datos.filas.length > MAX_FILAS_LOTE)
      throw new ValidacionError(
        `El lote supera las ${MAX_FILAS_LOTE} filas`,
        'LOTE_DEMASIADO_GRANDE',
      );

    // Todo se valida antes de abrir la transacción de escritura.
    const nuevas = new Map<string, { nombre: string; tipo: TipoMovimiento }>();
    for (const c of datos.categoriasNuevas) {
      const nombre = validarNombre(c.nombre);
      const clave = claveCategoriaNueva(c.tipo, nombre);
      if (!nuevas.has(clave)) nuevas.set(clave, { nombre, tipo: c.tipo });
    }

    const hoy = fechaEnZona(this.reloj.ahora(), zonaHoraria);
    const propias = new Map<string, Promise<Categoria | null>>();
    const filas = [];
    for (const [i, entrada] of datos.filas.entries()) {
      const fila = prepararFila(entrada, i, hoy);
      try {
        if (
          fila.categoriaNueva !== null &&
          !nuevas.has(claveCategoriaNueva(fila.tipo, fila.categoriaNueva))
        )
          throw new ValidacionError(
            'La categoría nueva no está declarada con el tipo de la fila',
            'CATEGORIA_NUEVA_INVALIDA',
          );
        if (fila.categoriaId !== null) {
          let p = propias.get(fila.categoriaId);
          if (!p) {
            p = this.categorias.obtener(userId, fila.categoriaId);
            propias.set(fila.categoriaId, p);
          }
          validarCategoria(await p, fila.tipo);
        }
      } catch (e) {
        if (e instanceof ValidacionError) throw new ValidacionFilaError(i, e);
        throw e;
      }
      filas.push(fila);
    }

    // Sólo se crean las categorías que alguna fila referencia.
    const usadas = new Set(
      filas
        .filter((f) => f.categoriaNueva !== null)
        .map((f) => claveCategoriaNueva(f.tipo, f.categoriaNueva!)),
    );
    return this.repo.guardar(userId, {
      nombreArchivo: datos.nombreArchivo,
      categoriasNuevas: [...nuevas]
        .filter(([k]) => usadas.has(k))
        .map(([, c]) => c),
      filas,
    });
  }
}
