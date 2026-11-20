import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '../../compartido/tipos.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class CrearTransaccionDto {
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO })
  @IsIn(TIPOS_MOVIMIENTO)
  tipo!: TipoMovimiento;
  @ApiProperty({
    type: String,
    example: '12.50',
    description: 'Mayor que 0, hasta 2 decimales, como string',
  })
  @IsString()
  monto!: string;
  @ApiProperty({
    type: String,
    example: '2026-11-19',
    description: 'YYYY-MM-DD',
  })
  @Matches(FECHA)
  fecha!: string;
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  descripcion!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((o: CrearTransaccionDto) => o.categoriaId !== null)
  @IsUUID()
  categoriaId!: string | null;
}

export class EditarTransaccionDto {
  @ApiPropertyOptional({ type: String, enum: TIPOS_MOVIMIENTO })
  @ValidateIf((o: EditarTransaccionDto) => o.tipo !== undefined)
  @IsIn(TIPOS_MOVIMIENTO)
  tipo?: TipoMovimiento;
  @ApiPropertyOptional({ type: String, example: '12.50' })
  @ValidateIf((o: EditarTransaccionDto) => o.monto !== undefined)
  @IsString()
  monto?: string;
  @ApiPropertyOptional({ type: String, example: '2026-11-19' })
  @ValidateIf((o: EditarTransaccionDto) => o.fecha !== undefined)
  @Matches(FECHA)
  fecha?: string;
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 200 })
  @ValidateIf((o: EditarTransaccionDto) => o.descripcion !== undefined)
  @IsString()
  descripcion?: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  categoriaId?: string | null;
}

export class ListarTransaccionesQuery {
  @ApiPropertyOptional({ type: String, example: '2026-11-01' })
  @IsOptional()
  @Matches(FECHA)
  desde?: string;
  @ApiPropertyOptional({ type: String, example: '2026-11-30' })
  @IsOptional()
  @Matches(FECHA)
  hasta?: string;
  @ApiPropertyOptional({ type: String, enum: TIPOS_MOVIMIENTO })
  @ValidateIf((o: ListarTransaccionesQuery) => o.tipo !== undefined)
  @IsIn(TIPOS_MOVIMIENTO)
  tipo?: TipoMovimiento;
  @ApiPropertyOptional({
    type: String,
    description: 'UUID o "sin" para las que no tienen categoría',
  })
  @IsOptional()
  @ValidateIf((o: ListarTransaccionesQuery) => o.categoriaId !== 'sin')
  @IsUUID()
  categoriaId?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamano: number = 50;
}

export const PERIODOS_RESUMEN = ['mes_anterior'] as const;

export class ResumenQuery {
  @ApiPropertyOptional({
    type: String,
    enum: PERIODOS_RESUMEN,
    description:
      'Período relativo resuelto en la zona del perfil; excluyente con desde/hasta',
  })
  @IsOptional()
  @IsIn(PERIODOS_RESUMEN)
  periodo?: (typeof PERIODOS_RESUMEN)[number];
  @ApiPropertyOptional({ type: String, example: '2026-11-01' })
  @IsOptional()
  @Matches(FECHA)
  desde?: string;
  @ApiPropertyOptional({ type: String, example: '2026-11-30' })
  @IsOptional()
  @Matches(FECHA)
  hasta?: string;
}
