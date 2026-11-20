import { IsOptional, IsString } from 'class-validator';

export class CrearPerfilDto {
  @IsString() moneda!: string;
  @IsString() zonaHoraria!: string;
}

export class ActualizarPerfilDto {
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @IsString() zonaHoraria?: string;
}
