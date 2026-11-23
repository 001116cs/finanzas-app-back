import { ApiProperty } from '@nestjs/swagger';

export class DuplicadosRespuesta {
  @ApiProperty({
    type: [Number],
    description: 'Índices (0-based, ascendentes) de filas ya registradas',
  })
  indices!: number[];
}
