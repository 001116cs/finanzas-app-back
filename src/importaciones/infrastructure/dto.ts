import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '../../compartido/tipos.js';

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
