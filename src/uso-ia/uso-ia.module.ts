import { Module } from '@nestjs/common';
import { RELOJ, relojDelSistema } from '../compartido/reloj.js';
import { cargarEnv } from '../config/env.js';
import {
  CONFIG_USO_IA,
  type ConfigUsoIa,
} from './application/config-uso-ia.js';
import { ObtenerUsoIa } from './application/obtener-uso-ia.js';
import { ReservarCupoBoleta } from './application/reservar-cupo-boleta.js';
import { RegistrarUsoBoleta } from './application/registrar-uso-boleta.js';
import { USO_IA_REPOSITORY } from './application/uso-ia.repository.js';
import { DrizzleUsoIaRepository } from './infrastructure/drizzle-uso-ia.repository.js';
import { UsoIaController } from './infrastructure/uso-ia.controller.js';

@Module({
  controllers: [UsoIaController],
  providers: [
    ReservarCupoBoleta,
    RegistrarUsoBoleta,
    ObtenerUsoIa,
    { provide: RELOJ, useValue: relojDelSistema },
    {
      provide: CONFIG_USO_IA,
      useFactory: (): ConfigUsoIa => {
        const env = cargarEnv();
        return {
          limiteBoletas: env.AI_LIMIT_RECEIPTS,
          limiteFallidos: env.AI_LIMIT_FAILED_ATTEMPTS,
          presupuestoUsd: env.AI_GLOBAL_MONTHLY_BUDGET_USD,
        };
      },
    },
    { provide: USO_IA_REPOSITORY, useClass: DrizzleUsoIaRepository },
  ],
  exports: [
    ReservarCupoBoleta,
    RegistrarUsoBoleta,
    ObtenerUsoIa,
    RELOJ,
    CONFIG_USO_IA,
    USO_IA_REPOSITORY,
  ],
})
export class UsoIaModule {}
