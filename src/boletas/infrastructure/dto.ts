import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ProductoBoletaDto {
  @ApiProperty({ type: String })
  @IsString()
  descripcion!: string;
  @ApiProperty({ type: String, example: '12.50' })
  @IsString()
  monto!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((o: ProductoBoletaDto) => o.categoriaId !== null)
  @IsUUID()
  categoriaId!: string | null;
}

export class GuardarBoletaDto {
  @ApiProperty({ type: String })
  @IsString()
  comercio!: string;
  @ApiProperty({ type: String, example: '2026-11-19' })
  @IsString()
  fecha!: string;
  @ApiProperty({ type: String, nullable: true, example: '23.40' })
  @ValidateIf((o: GuardarBoletaDto) => o.totalImpreso !== null)
  @IsString()
  totalImpreso!: string | null;
  @ApiProperty({
    type: () => [ProductoBoletaDto],
    description: '1 a 100 productos',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductoBoletaDto)
  productos!: ProductoBoletaDto[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class EditarBoletaDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 100 })
  @ValidateIf((o: EditarBoletaDto) => o.comercio !== undefined)
  @IsString()
  comercio?: string;
  @ApiPropertyOptional({ type: String, example: '2026-11-19' })
  @ValidateIf((o: EditarBoletaDto) => o.fecha !== undefined)
  @Matches(FECHA)
  fecha?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '23.40',
    description: 'null quita el total impreso',
  })
  @ValidateIf(
    (o: EditarBoletaDto) =>
      o.totalImpreso !== undefined && o.totalImpreso !== null,
  )
  @IsString()
  totalImpreso?: string | null;
}

export class GastoBoletaDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  descripcion!: string;
  @ApiProperty({ type: String, example: '12.50', description: 'Mayor que 0' })
  @IsString()
  monto!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((o: GastoBoletaDto) => o.categoriaId !== null)
  @IsUUID()
  categoriaId!: string | null;
}

export class ListarBoletasQuery {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 50, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  tamano: number = 12;
}

export class EliminarBoletaQuery {
  @ApiPropertyOptional({
    enum: ['conservar', 'eliminar'],
    default: 'conservar',
    description:
      "Qué hacer con los gastos creados desde la boleta: 'conservar' (por defecto) los deja sin enlace; 'eliminar' los borra junto con la boleta",
  })
  @IsOptional()
  @IsIn(['conservar', 'eliminar'])
  gastos?: 'conservar' | 'eliminar';
}
