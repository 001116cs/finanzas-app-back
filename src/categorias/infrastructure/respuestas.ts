import { ApiProperty } from '@nestjs/swagger';
import { TIPOS_MOVIMIENTO } from '../../compartido/tipos.js';

export class CategoriaRespuesta {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) nombre!: string;
  @ApiProperty({ type: String, enum: TIPOS_MOVIMIENTO }) tipo!: string;
  @ApiProperty({ type: Number, example: 0 }) cantidadMovimientos!: number;
}
