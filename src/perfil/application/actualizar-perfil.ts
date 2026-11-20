import { Inject, Injectable } from '@nestjs/common';
import { PerfilRequeridoError } from '../../compartido/errores.js';
import {
  validarMoneda,
  validarZonaHoraria,
  type Perfil,
} from '../domain/perfil.js';
import {
  PERFIL_REPOSITORY,
  type PerfilRepository,
} from './perfil.repository.js';

@Injectable()
export class ActualizarPerfil {
  constructor(
    @Inject(PERFIL_REPOSITORY) private readonly repo: PerfilRepository,
  ) {}

  async ejecutar(
    userId: string,
    cambios: { moneda?: string; zonaHoraria?: string },
  ): Promise<Perfil> {
    const actual = await this.repo.obtener(userId);
    if (!actual) throw new PerfilRequeridoError();
    const perfil: Perfil = {
      ...actual,
      moneda:
        cambios.moneda !== undefined
          ? validarMoneda(cambios.moneda)
          : actual.moneda,
      zonaHoraria:
        cambios.zonaHoraria !== undefined
          ? validarZonaHoraria(cambios.zonaHoraria)
          : actual.zonaHoraria,
    };
    await this.repo.actualizar(perfil);
    return perfil;
  }
}
