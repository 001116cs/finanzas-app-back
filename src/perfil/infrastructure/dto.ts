import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CrearPerfilDto {
  @ApiProperty({ type: String, example: 'PEN', description: 'Código ISO 4217' })
  @IsString()
  moneda!: string;
  @ApiProperty({
    type: String,
    example: 'America/Lima',
    description: 'Zona horaria IANA',
  })
  @IsString()
  zonaHoraria!: string;
}

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ type: String, example: 'PEN' })
  @IsOptional()
  @IsString()
  moneda?: string;
  @ApiPropertyOptional({ type: String, example: 'America/Lima' })
  @IsOptional()
  @IsString()
  zonaHoraria?: string;
}
