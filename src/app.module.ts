import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import { cargarEnv } from './config/env.js';
import { AuthGuard } from './compartido/auth/auth.guard.js';
import { JoseVerificador } from './compartido/auth/jose-verificador.js';
import { VERIFICADOR_DE_TOKEN } from './compartido/auth/verificador-de-token.js';
import { FiltroErrores } from './compartido/filtro-errores.js';
import { DbModule } from './db/db.module.js';
import { PerfilRequeridoGuard } from './compartido/perfil-requerido.guard.js';
import { PerfilModule } from './perfil/perfil.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [DbModule, PerfilModule, CategoriasModule],
  controllers: [HealthController],
  providers: [
    {
      provide: VERIFICADOR_DE_TOKEN,
      useFactory: () => {
        const base = `${cargarEnv().SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
        return new JoseVerificador(
          createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`)),
          base,
        );
      },
    },
    // El orden importa: AuthGuard primero, luego PerfilRequeridoGuard.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PerfilRequeridoGuard },
    { provide: APP_FILTER, useClass: FiltroErrores },
  ],
})
export class AppModule {}
