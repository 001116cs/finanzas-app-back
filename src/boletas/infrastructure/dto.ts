import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsUUID,
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
