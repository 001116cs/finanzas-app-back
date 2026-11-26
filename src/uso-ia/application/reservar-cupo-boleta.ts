import { Inject, Injectable } from '@nestjs/common';
import { ConflictoError } from '../../compartido/errores.js';
import { RELOJ, type Reloj } from '../../compartido/reloj.js';
import {
  evaluarCupoBoletas,
  mesEnZona,
  mesUtc,
  type CodigoLimiteIa,
} from '../domain/limites.js';
import { CONFIG_USO_IA, type ConfigUsoIa } from './config-uso-ia.js';
import {
  USO_IA_REPOSITORY,
  type UsoIaRepository,
} from './uso-ia.repository.js';

@Injectable()
export class ReservarCupoBoleta {
  constructor(
    @Inject(USO_IA_REPOSITORY) private readonly repo: UsoIaRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
    @Inject(CONFIG_USO_IA) private readonly config: ConfigUsoIa,
  ) {}

  /**
   * Reserva atómicamente una boleta del cupo del usuario antes de llamar a la
   * IA y devuelve el mes reservado (para confirmar o liberar en ese mismo mes).
   *
   * El tope global es comprobar-antes: el costo no se conoce hasta después de
   * la llamada, así que el sobrepaso está acotado por las peticiones en vuelo
   * (cada una cuesta como máximo lo que valen 16000 tokens de salida).
   */
  async ejecutar(
    userId: string,
    zonaHoraria: string,
  ): Promise<{ mes: string }> {
    const ahora = this.reloj.ahora();
    const mes = mesEnZona(ahora, zonaHoraria);
    const costoGlobalUsd = await this.repo.costoGlobal(mesUtc(ahora));
    if (costoGlobalUsd >= this.config.presupuestoUsd) {
      throw this.conflicto('LIMITE_GLOBAL_IA');
    }
    const reservada = await this.repo.reservarBoleta(
      userId,
      mes,
      this.config.limiteBoletas,
      this.config.limiteFallidos,
    );
    if (reservada) return { mes };

    const uso = await this.repo.obtener(userId, mes);
    const codigo = evaluarCupoBoletas({
      usadas: uso.boletasUsadas,
      fallidos: uso.intentosFallidos,
      limite: this.config.limiteBoletas,
      limiteFallidos: this.config.limiteFallidos,
      costoGlobalUsd: 0,
      presupuestoUsd: this.config.presupuestoUsd,
    });
    throw this.conflicto(codigo ?? 'LIMITE_BOLETAS');
  }

  private conflicto(codigo: CodigoLimiteIa): ConflictoError {
    return new ConflictoError(codigo, this.mensaje(codigo));
  }

  private mensaje(codigo: CodigoLimiteIa): string {
    switch (codigo) {
      case 'LIMITE_GLOBAL_IA':
        return 'El servicio de lectura de boletas alcanzó su tope mensual; vuelve a intentarlo el próximo mes';
      case 'LIMITE_BOLETAS':
        return `Alcanzaste el límite de ${this.config.limiteBoletas} boletas este mes`;
      case 'LIMITE_INTENTOS_FALLIDOS':
        return `Alcanzaste el límite de ${this.config.limiteFallidos} intentos fallidos este mes`;
    }
  }
}
