import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '../../compartido/tipos.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class CrearTransaccionDto {
  @IsIn(TIPOS_MOVIMIENTO) tipo!: TipoMovimiento;
  @IsString() monto!: string;
  @Matches(FECHA) fecha!: string;
  @IsString() descripcion!: string;
  @ValidateIf((o: CrearTransaccionDto) => o.categoriaId !== null)
  @IsUUID()
  categoriaId!: string | null;
}

export class EditarTransaccionDto {
  @IsOptional() @IsIn(TIPOS_MOVIMIENTO) tipo?: TipoMovimiento;
  @IsOptional() @IsString() monto?: string;
  @IsOptional() @Matches(FECHA) fecha?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsUUID() categoriaId?: string | null;
}

export class ListarTransaccionesQuery {
  @IsOptional() @Matches(FECHA) desde?: string;
  @IsOptional() @Matches(FECHA) hasta?: string;
  @IsOptional() @IsIn(TIPOS_MOVIMIENTO) tipo?: TipoMovimiento;
  @IsOptional()
  @ValidateIf((o: ListarTransaccionesQuery) => o.categoriaId !== 'sin')
  @IsUUID()
  categoriaId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) tamano: number =
    50;
}
