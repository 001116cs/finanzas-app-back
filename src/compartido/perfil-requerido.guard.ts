import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERFIL_REPOSITORY,
  type PerfilRepository,
} from '../perfil/application/perfil.repository.js';
import type { Perfil } from '../perfil/domain/perfil.js';
import { ES_PUBLICO } from './auth/decoradores.js';
import { PerfilRequeridoError } from './errores.js';

export const SIN_PERFIL = 'sinPerfil';

/** Marca una ruta que no exige perfil (p. ej. /perfil, /health). */
export const SinPerfil = () => SetMetadata(SIN_PERFIL, true);

/** Debe registrarse DESPUÉS de AuthGuard. Expone `request.perfil`. */
@Injectable()
export class PerfilRequeridoGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PERFIL_REPOSITORY) private readonly repo: PerfilRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(SIN_PERFIL, objetivos) ||
      this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, objetivos)
    )
      return true;
    const req = ctx
      .switchToHttp()
      .getRequest<{ userId?: string; perfil?: Perfil }>();
    if (!req.userId) return true; // AuthGuard ya habría rechazado
    const perfil = await this.repo.obtener(req.userId);
    if (!perfil) throw new PerfilRequeridoError();
    req.perfil = perfil;
    return true;
  }
}
