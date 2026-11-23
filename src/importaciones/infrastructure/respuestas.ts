import { ApiProperty } from '@nestjs/swagger';

export class DuplicadosRespuesta {
  @ApiProperty({
    type: [Number],
    description: 'Índices (0-based, ascendentes) de filas ya registradas',
  })
  indices!: number[];
}

export class ImportacionRespuesta {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) nombreArchivo!: string;
  @ApiProperty({ type: Number }) filasImportadas!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
