import { Module } from '@nestjs/common';
import { RELOJ, relojDelSistema } from '../compartido/reloj.js';
import { CategoriasModule } from '../categorias/categorias.module.js';
import { CrearTransaccion } from './application/crear-transaccion.js';
import { EditarTransaccion } from './application/editar-transaccion.js';
import { EliminarTransaccion } from './application/eliminar-transaccion.js';
import { ObtenerResumen } from './application/obtener-resumen.js';
import { ListarTransacciones } from './application/listar-transacciones.js';
import { TRANSACCION_REPOSITORY } from './application/transaccion.repository.js';
import { DrizzleTransaccionRepository } from './infrastructure/drizzle-transaccion.repository.js';
import { ResumenController } from './infrastructure/resumen.controller.js';
import { TransaccionesController } from './infrastructure/transacciones.controller.js';

@Module({
  imports: [CategoriasModule],
  controllers: [TransaccionesController, ResumenController],
  providers: [
    CrearTransaccion,
    ListarTransacciones,
    EditarTransaccion,
    EliminarTransaccion,
    ObtenerResumen,
    { provide: RELOJ, useValue: relojDelSistema },
    { provide: TRANSACCION_REPOSITORY, useClass: DrizzleTransaccionRepository },
  ],
  exports: [TRANSACCION_REPOSITORY],
})
export class TransaccionesModule {}
