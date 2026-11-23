import { Module } from '@nestjs/common';
import { RELOJ, relojDelSistema } from '../compartido/reloj.js';
import { BuscarDuplicados } from './application/buscar-duplicados.js';
import { IMPORTACION_REPOSITORY } from './application/importacion.repository.js';
import { DrizzleImportacionRepository } from './infrastructure/drizzle-importacion.repository.js';
import { ImportacionesController } from './infrastructure/importaciones.controller.js';

@Module({
  controllers: [ImportacionesController],
  providers: [
    BuscarDuplicados,
    { provide: RELOJ, useValue: relojDelSistema },
    { provide: IMPORTACION_REPOSITORY, useClass: DrizzleImportacionRepository },
  ],
})
export class ImportacionesModule {}
