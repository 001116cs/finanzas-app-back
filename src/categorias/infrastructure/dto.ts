import {
  MODOS_ELIMINACION,
  type ModoEliminacion,
} from '../application/categoria.repository.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '../../compartido/tipos.js';

export class CrearCategoriaDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 50 })
  @IsString()
  nombre!: string;
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO })
  @IsIn(TIPOS_MOVIMIENTO)
  tipo!: TipoMovimiento;
}

export class RenombrarCategoriaDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 50 })
  @IsString()
  nombre!: string;
}

export class ListarCategoriasQuery {
  @ApiPropertyOptional({ type: String, enum: TIPOS_MOVIMIENTO })
  @IsOptional()
  @IsIn(TIPOS_MOVIMIENTO)
  tipo?: TipoMovimiento;
}

export class EliminarCategoriaQuery {
  @ApiPropertyOptional({ type: String, enum: MODOS_ELIMINACION })
  @IsOptional()
  @IsIn(MODOS_ELIMINACION)
  modo?: ModoEliminacion;
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Obligatorio con modo=mover',
  })
  @IsOptional()
  @IsUUID()
  destinoId?: string;
}
