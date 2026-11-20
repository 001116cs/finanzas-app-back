import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORIAS_SUGERIDAS,
  validarMoneda,
  validarZonaHoraria,
  type Perfil,
} from '../domain/perfil.js';
import {
  PERFIL_REPOSITORY,
  type PerfilRepository,
} from './perfil.repository.js';

@Injectable()
export class CrearPerfil {
  constructor(
    @Inject(PERFIL_REPOSITORY) private readonly repo: PerfilRepository,
  ) {}

  async ejecutar(
    userId: string,
    datos: { moneda: string; zonaHoraria: string },
  ): Promise<{ creado: boolean; perfil: Perfil }> {
    const moneda = validarMoneda(datos.moneda);
    const zonaHoraria = validarZonaHoraria(datos.zonaHoraria);
    const existente = await this.repo.obtener(userId);
    if (existente) return { creado: false, perfil: existente };
    const perfil: Perfil = { id: userId, moneda, zonaHoraria };
    try {
      await this.repo.crearConCategorias(perfil, CATEGORIAS_SUGERIDAS);
    } catch (e) {
      // Carrera: otra petición lo creó entre obtener y crear.
      const ahora = await this.repo.obtener(userId);
      if (ahora) return { creado: false, perfil: ahora };
      throw e;
    }
    return { creado: true, perfil };
  }
}
