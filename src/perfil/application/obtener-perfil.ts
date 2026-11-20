import { Inject, Injectable } from '@nestjs/common';
import { PerfilRequeridoError } from '../../compartido/errores.js';
import type { Perfil } from '../domain/perfil.js';
import {
  PERFIL_REPOSITORY,
  type PerfilRepository,
} from './perfil.repository.js';

@Injectable()
export class ObtenerPerfil {
  constructor(
    @Inject(PERFIL_REPOSITORY) private readonly repo: PerfilRepository,
  ) {}

  async ejecutar(userId: string): Promise<Perfil> {
    const perfil = await this.repo.obtener(userId);
    if (!perfil) throw new PerfilRequeridoError();
    return perfil;
  }
}
