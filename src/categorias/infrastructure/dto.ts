import {
  MODOS_ELIMINACION,
  type ModoEliminacion,
} from '../application/categoria.repository.js';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '../../compartido/tipos.js';

export class CrearCategoriaDto {
  @IsString() nombre!: string;
  @IsIn(TIPOS_MOVIMIENTO) tipo!: TipoMovimiento;
}

export class RenombrarCategoriaDto {
  @IsString() nombre!: string;
}

export class ListarCategoriasQuery {
  @IsOptional() @IsIn(TIPOS_MOVIMIENTO) tipo?: TipoMovimiento;
}

export class EliminarCategoriaQuery {
  @IsOptional() @IsIn(MODOS_ELIMINACION) modo?: ModoEliminacion;
  @IsOptional() @IsUUID() destinoId?: string;
}
