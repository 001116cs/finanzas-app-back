import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NoAutenticadoError } from '../errores.js';
import { ES_PUBLICO } from './decoradores.js';
import {
  VERIFICADOR_DE_TOKEN,
  type VerificadorDeToken,
} from './verificador-de-token.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(VERIFICADOR_DE_TOKEN)
    private readonly verificador: VerificadorDeToken,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (publico) return true;

    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      userId?: string;
    }>();
    const [esquema, token] = (req.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token)
      throw new NoAutenticadoError('Falta el token');
    req.userId = (await this.verificador.verificar(token)).userId;
    return true;
  }
}
