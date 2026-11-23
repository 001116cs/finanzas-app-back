import { Inject, Injectable } from '@nestjs/common';
import { ValidacionError } from '../../compartido/errores.js';
import { fechaEnZona } from '../../compartido/fechas.js';
import { RELOJ, type Reloj } from '../../compartido/reloj.js';
import {
  claveDuplicado,
  MAX_FILAS_LOTE,
  prepararFila,
  type FilaEntrada,
} from '../domain/fila-importada.js';
import {
  IMPORTACION_REPOSITORY,
  type ImportacionRepository,
} from './importacion.repository.js';

export type FilaDuplicados = Pick<
  FilaEntrada,
  'fecha' | 'descripcion' | 'monto' | 'tipo'
>;

@Injectable()
export class BuscarDuplicados {
  constructor(
    @Inject(IMPORTACION_REPOSITORY)
    private readonly repo: ImportacionRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  /** Índices (ascendentes) de filas que ya existen guardadas para el usuario. */
  async ejecutar(
    userId: string,
    zonaHoraria: string,
    filas: FilaDuplicados[],
  ): Promise<number[]> {
    if (filas.length === 0)
      throw new ValidacionError('El lote no tiene filas', 'LOTE_VACIO');
    if (filas.length > MAX_FILAS_LOTE)
      throw new ValidacionError(
        `El lote supera las ${MAX_FILAS_LOTE} filas`,
        'LOTE_DEMASIADO_GRANDE',
      );
    const hoy = fechaEnZona(this.reloj.ahora(), zonaHoraria);
    const preparadas = filas.map((f, i) =>
      prepararFila({ ...f, categoriaId: null, categoriaNueva: null }, i, hoy),
    );
    const existentes = await this.repo.clavesExistentes(userId, preparadas);
    const indices: number[] = [];
    preparadas.forEach((f, i) => {
      if (existentes.has(claveDuplicado(f))) indices.push(i);
    });
    return indices;
  }
}
