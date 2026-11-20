import { ApiProperty } from '@nestjs/swagger';

export class PerfilRespuesta {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, example: 'PEN' }) moneda!: string;
  @ApiProperty({ type: String, example: 'America/Lima' }) zonaHoraria!: string;
}
