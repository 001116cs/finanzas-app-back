import { Inject, Injectable } from '@nestjs/common';
import { RELOJ, type Reloj } from '../../compartido/reloj.js';
import { mesUtc } from '../domain/limites.js';
import { costoUsd, type UsoTokens } from '../domain/precios.js';
import {
  USO_IA_REPOSITORY,
  type UsoIaRepository,
} from './uso-ia.repository.js';

/** `mes` es el devuelto por ReservarCupoBoleta. */
@Injectable()
export class RegistrarUsoBoleta {
  constructor(
    @Inject(USO_IA_REPOSITORY) private readonly repo: UsoIaRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  /** Boleta procesada: la reserva se queda como uso y suma el costo al global. */
  async exito(_mes: string, uso: UsoTokens): Promise<void> {
    await this.repo.confirmarBoleta(mesUtc(this.reloj.ahora()), costoUsd(uso));
  }

  /** Intento fallido: libera la boleta, cuenta un fallo y suma el costo global. */
  async fallo(userId: string, mes: string, uso: UsoTokens): Promise<void> {
    await this.repo.liberarComoFallo(
      userId,
      mes,
      mesUtc(this.reloj.ahora()),
      costoUsd(uso),
    );
  }

  /** La IA no respondió: devuelve la reserva sin costo ni fallo. */
  async cancelar(userId: string, mes: string): Promise<void> {
    await this.repo.liberar(userId, mes);
  }
}
