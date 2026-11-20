import { ApiProperty } from '@nestjs/swagger';

export class ErrorRespuesta {
  @ApiProperty({ type: String, example: 'PERFIL_REQUERIDO' }) codigo!: string;
  @ApiProperty({ type: String }) mensaje!: string;
}
