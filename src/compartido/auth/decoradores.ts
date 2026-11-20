import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Perfil } from '../../perfil/domain/perfil.js';

export const ES_PUBLICO = 'esPublico';

/** Marca una ruta como accesible sin token. */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

/** Inyecta el userId autenticado (sale sólo del token). */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<{ userId: string }>().userId,
);

/** Inyecta el perfil cargado por PerfilRequeridoGuard (moneda, zona horaria). */
export const PerfilActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Perfil =>
    ctx.switchToHttp().getRequest<{ perfil: Perfil }>().perfil,
);
