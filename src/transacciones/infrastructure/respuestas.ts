import { ApiProperty } from '@nestjs/swagger';
import { TIPOS_MOVIMIENTO } from '../../compartido/tipos.js';

export class TransaccionRespuesta {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO }) tipo!: string;
  @ApiProperty({
    type: String,
    example: '12.50',
    description: 'Siempre con 2 decimales',
  })
  monto!: string;
  @ApiProperty({
    type: String,
    example: '2026-11-19',
    description: 'YYYY-MM-DD',
  })
  fecha!: string;
  @ApiProperty({ type: String }) descripcion!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  categoriaId!: string | null;
  @ApiProperty({ type: String, nullable: true }) categoriaNombre!:
    string | null;
  @ApiProperty({ type: String, enum: ['manual', 'excel', 'boleta'] })
  origen!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Boleta de la que proviene el gasto; null si no aplica',
  })
  boletaId!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class ListaTransaccionesRespuesta {
  @ApiProperty({ type: () => [TransaccionRespuesta] })
  items!: TransaccionRespuesta[];
  @ApiProperty({ type: Number }) total!: number;
}

export class TotalCategoriaRespuesta {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  categoriaId!: string | null;
  @ApiProperty({ type: String }) nombre!: string;
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO }) tipo!: string;
  @ApiProperty({ type: String, example: '10.00' }) total!: string;
}

export class ResumenRespuesta {
  @ApiProperty({ type: String, example: '2026-11-01' }) desde!: string;
  @ApiProperty({ type: String, example: '2026-11-30' }) hasta!: string;
  @ApiProperty({ type: String, example: 'PEN' }) moneda!: string;
  @ApiProperty({ type: String, example: '0.00' }) totalGastos!: string;
  @ApiProperty({ type: String, example: '0.00' }) totalIngresos!: string;
  @ApiProperty({
    type: String,
    example: '-20.00',
    description: 'Puede ser negativo',
  })
  balance!: string;
  @ApiProperty({ type: () => [TotalCategoriaRespuesta] })
  porCategoria!: TotalCategoriaRespuesta[];
}
