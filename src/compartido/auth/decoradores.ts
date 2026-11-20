import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export const ES_PUBLICO = 'esPublico';

/** Marca una ruta como accesible sin token. */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

/** Inyecta el userId autenticado (sale sólo del token). */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<{ userId: string }>().userId,
);
