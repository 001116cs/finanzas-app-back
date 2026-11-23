import { Module } from '@nestjs/common';
import { CategoriasModule } from '../categorias/categorias.module.js';
import { RELOJ, relojDelSistema } from '../compartido/reloj.js';
import { BuscarDuplicados } from './application/buscar-duplicados.js';
import { DeshacerImportacion } from './application/deshacer-importacion.js';
import { GuardarImportacion } from './application/guardar-importacion.js';
import { ListarImportaciones } from './application/listar-importaciones.js';
import { IMPORTACION_REPOSITORY } from './application/importacion.repository.js';
import { DrizzleImportacionRepository } from './infrastructure/drizzle-importacion.repository.js';
import { ImportacionesController } from './infrastructure/importaciones.controller.js';

@Module({
  imports: [CategoriasModule],
  controllers: [ImportacionesController],
  providers: [
    BuscarDuplicados,
    GuardarImportacion,
    ListarImportaciones,
    DeshacerImportacion,
    { provide: RELOJ, useValue: relojDelSistema },
    { provide: IMPORTACION_REPOSITORY, useClass: DrizzleImportacionRepository },
  ],
})
export class ImportacionesModule {}
