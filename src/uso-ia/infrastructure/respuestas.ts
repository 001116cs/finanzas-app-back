import { ApiProperty } from '@nestjs/swagger';

export class BoletasUsoRespuesta {
  @ApiProperty({ type: Number, description: 'Boletas procesadas este mes' })
  usadas!: number;
  @ApiProperty({ type: Number, description: 'Máximo de boletas por mes' })
  limite!: number;
}

export class IntentosFallidosUsoRespuesta {
  @ApiProperty({ type: Number, description: 'Intentos fallidos este mes' })
  usados!: number;
  @ApiProperty({
    type: Number,
    description: 'Máximo de intentos fallidos por mes',
  })
  limite!: number;
}

export class UsoIaRespuesta {
  @ApiProperty({
    type: String,
    example: '2026-11',
    description: 'Mes (YYYY-MM) en la zona del usuario',
  })
  mes!: string;
  @ApiProperty({ type: BoletasUsoRespuesta }) boletas!: BoletasUsoRespuesta;
  @ApiProperty({ type: IntentosFallidosUsoRespuesta })
  intentosFallidos!: IntentosFallidosUsoRespuesta;
  @ApiProperty({
    type: Boolean,
    description: 'true si se agotó el tope global mensual de IA',
  })
  globalAgotado!: boolean;
}
