import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '../../compartido/tipos.js';
import { MAX_FILAS_LOTE } from '../domain/fila-importada.js';

export class FilaDuplicadoDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-11-19',
    description: 'YYYY-MM-DD; null = hoy en la zona horaria del perfil',
  })
  @ValidateIf((o: FilaDuplicadoDto) => o.fecha !== null)
  @IsString()
  fecha!: string | null;
  @ApiProperty({ type: String })
  @IsString()
  descripcion!: string;
  @ApiProperty({ type: String, example: '12.50' })
  @IsString()
  monto!: string;
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO })
  @IsIn(TIPOS_MOVIMIENTO)
  tipo!: TipoMovimiento;
}

export class DuplicadosDto {
  @ApiProperty({
    type: [FilaDuplicadoDto],
    description: '1 a 2000 filas',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilaDuplicadoDto)
  filas!: FilaDuplicadoDto[];
}

export class FilaImportacionDto extends FilaDuplicadoDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Categoría existente del usuario y del tipo de la fila',
  })
  @ValidateIf((o: FilaImportacionDto) => o.categoriaId !== null)
  @IsUUID()
  categoriaId!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Nombre de una de `categoriasNuevas` del mismo tipo; no puede combinarse con categoriaId',
  })
  @ValidateIf((o: FilaImportacionDto) => o.categoriaNueva !== null)
  @IsString()
  categoriaNueva!: string | null;
}

export class CategoriaNuevaDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 50 })
  @IsString()
  nombre!: string;
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO })
  @IsIn(TIPOS_MOVIMIENTO)
  tipo!: TipoMovimiento;
}

export class ImportacionDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombreArchivo!: string;
  @ApiProperty({ type: [CategoriaNuevaDto], description: 'Categorías a crear' })
  @IsArray()
  @ArrayMaxSize(MAX_FILAS_LOTE)
  @ValidateNested({ each: true })
  @Type(() => CategoriaNuevaDto)
  categoriasNuevas!: CategoriaNuevaDto[];
  @ApiProperty({ type: [FilaImportacionDto], description: '1 a 2000 filas' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilaImportacionDto)
  filas!: FilaImportacionDto[];
}
