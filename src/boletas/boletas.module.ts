import { Module } from '@nestjs/common';
import { CategoriasModule } from '../categorias/categorias.module.js';
import { cargarEnv } from '../config/env.js';
import { UsoIaModule } from '../uso-ia/uso-ia.module.js';
import { BOLETA_REPOSITORY } from './application/boleta.repository.js';
import { AgregarGastoBoleta } from './application/agregar-gasto-boleta.js';
import { EditarBoleta } from './application/editar-boleta.js';
import { ListarBoletas } from './application/listar-boletas.js';
import { ObtenerDetalleBoleta } from './application/obtener-detalle-boleta.js';
import { EliminarBoleta } from './application/eliminar-boleta.js';
import { EscanearBoleta } from './application/escanear-boleta.js';
import { GuardarBoleta } from './application/guardar-boleta.js';
import { LECTOR_DE_BOLETAS } from './application/lector-de-boletas.js';
import { ObtenerBoleta } from './application/obtener-boleta.js';
import { ObtenerImagenBoleta } from './application/obtener-imagen-boleta.js';
import { BoletasController } from './infrastructure/boletas.controller.js';
import { DrizzleBoletaRepository } from './infrastructure/drizzle-boleta.repository.js';
import { crearLectorDeBoletas } from './infrastructure/proveedor-lector.js';

@Module({
  imports: [CategoriasModule, UsoIaModule],
  controllers: [BoletasController],
  providers: [
    EscanearBoleta,
    GuardarBoleta,
    ObtenerBoleta,
    ObtenerImagenBoleta,
    EliminarBoleta,
    ListarBoletas,
    ObtenerDetalleBoleta,
    EditarBoleta,
    AgregarGastoBoleta,
    { provide: BOLETA_REPOSITORY, useClass: DrizzleBoletaRepository },
    {
      provide: LECTOR_DE_BOLETAS,
      useFactory: () => crearLectorDeBoletas(cargarEnv()),
    },
  ],
})
export class BoletasModule {}
