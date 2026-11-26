import { ApiProperty } from '@nestjs/swagger';

export class ProductoLeidoRespuesta {
  @ApiProperty({ type: String }) descripcion!: string;
  @ApiProperty({
    type: String,
    example: '12.50',
    description: 'Con 2 decimales; puede ser negativo (descuentos)',
  })
  monto!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Categoría de gasto del usuario sugerida; null si no hay',
  })
  categoriaId!: string | null;
}

export class LecturaBoletaRespuesta {
  @ApiProperty({ type: String }) comercio!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-11-19',
    description: 'YYYY-MM-DD; null si no se pudo leer',
  })
  fecha!: string | null;
  @ApiProperty({ type: String, nullable: true, example: '23.40' })
  totalImpreso!: string | null;
  @ApiProperty({ type: () => [ProductoLeidoRespuesta] })
  productos!: ProductoLeidoRespuesta[];
}

export class GuardarBoletaRespuesta {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: Number }) gastosCreados!: number;
}

export class BoletaRespuesta {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) comercio!: string;
  @ApiProperty({
    type: String,
    example: '2026-11-19',
    description: 'YYYY-MM-DD',
  })
  fecha!: string;
  @ApiProperty({ type: String, nullable: true, example: '23.40' })
  totalImpreso!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
