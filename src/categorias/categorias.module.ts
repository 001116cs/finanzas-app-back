import { Module } from '@nestjs/common';
import { CATEGORIA_REPOSITORY } from './application/categoria.repository.js';
import { CrearCategoria } from './application/crear-categoria.js';
import { ListarCategorias } from './application/listar-categorias.js';
import { RenombrarCategoria } from './application/renombrar-categoria.js';
import { CategoriasController } from './infrastructure/categorias.controller.js';
import { DrizzleCategoriaRepository } from './infrastructure/drizzle-categoria.repository.js';

@Module({
  controllers: [CategoriasController],
  providers: [
    CrearCategoria,
    ListarCategorias,
    RenombrarCategoria,
    { provide: CATEGORIA_REPOSITORY, useClass: DrizzleCategoriaRepository },
  ],
  exports: [CATEGORIA_REPOSITORY],
})
export class CategoriasModule {}
