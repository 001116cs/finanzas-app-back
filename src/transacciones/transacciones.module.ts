import { Module } from '@nestjs/common';
import { CategoriasModule } from '../categorias/categorias.module.js';
import { CrearTransaccion } from './application/crear-transaccion.js';
import { EditarTransaccion } from './application/editar-transaccion.js';
import { EliminarTransaccion } from './application/eliminar-transaccion.js';
import { ListarTransacciones } from './application/listar-transacciones.js';
import { TRANSACCION_REPOSITORY } from './application/transaccion.repository.js';
import { DrizzleTransaccionRepository } from './infrastructure/drizzle-transaccion.repository.js';
import { TransaccionesController } from './infrastructure/transacciones.controller.js';

@Module({
  imports: [CategoriasModule],
  controllers: [TransaccionesController],
  providers: [
    CrearTransaccion,
    ListarTransacciones,
    EditarTransaccion,
    EliminarTransaccion,
    { provide: TRANSACCION_REPOSITORY, useClass: DrizzleTransaccionRepository },
  ],
  exports: [TRANSACCION_REPOSITORY],
})
export class TransaccionesModule {}
