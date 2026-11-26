import { Inject, Injectable } from '@nestjs/common';
import { RELOJ, type Reloj } from '../../compartido/reloj.js';
import { mesEnZona, mesUtc } from '../domain/limites.js';
import { CONFIG_USO_IA, type ConfigUsoIa } from './config-uso-ia.js';
import {
  USO_IA_REPOSITORY,
  type UsoIaRepository,
} from './uso-ia.repository.js';

export interface UsoIa {
  mes: string;
  boletas: { usadas: number; limite: number };
  intentosFallidos: { usados: number; limite: number };
  globalAgotado: boolean;
}

@Injectable()
export class ObtenerUsoIa {
  constructor(
    @Inject(USO_IA_REPOSITORY) private readonly repo: UsoIaRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
    @Inject(CONFIG_USO_IA) private readonly config: ConfigUsoIa,
  ) {}

  async ejecutar(userId: string, zonaHoraria: string): Promise<UsoIa> {
    const ahora = this.reloj.ahora();
    const mes = mesEnZona(ahora, zonaHoraria);
    const [uso, costoGlobal] = await Promise.all([
      this.repo.obtener(userId, mes),
      this.repo.costoGlobal(mesUtc(ahora)),
    ]);
    return {
      mes,
      boletas: { usadas: uso.boletasUsadas, limite: this.config.limiteBoletas },
      intentosFallidos: {
        usados: uso.intentosFallidos,
        limite: this.config.limiteFallidos,
      },
      globalAgotado: costoGlobal >= this.config.presupuestoUsd,
    };
  }
}
