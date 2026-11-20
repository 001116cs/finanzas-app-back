import { Module } from '@nestjs/common';
import { ActualizarPerfil } from './application/actualizar-perfil.js';
import { CrearPerfil } from './application/crear-perfil.js';
import { ObtenerPerfil } from './application/obtener-perfil.js';
import { PERFIL_REPOSITORY } from './application/perfil.repository.js';
import { DrizzlePerfilRepository } from './infrastructure/drizzle-perfil.repository.js';
import { PerfilController } from './infrastructure/perfil.controller.js';

@Module({
  controllers: [PerfilController],
  providers: [
    CrearPerfil,
    ObtenerPerfil,
    ActualizarPerfil,
    { provide: PERFIL_REPOSITORY, useClass: DrizzlePerfilRepository },
  ],
  exports: [PERFIL_REPOSITORY],
})
export class PerfilModule {}
