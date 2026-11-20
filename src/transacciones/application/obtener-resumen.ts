import { Inject, Injectable } from '@nestjs/common';
import { ValidacionError } from '../../compartido/errores.js';
import { rangoMesActual, rangoMesAnterior } from '../../compartido/fechas.js';
import { Monto } from '../../compartido/monto.js';
import { RELOJ, type Reloj } from '../../compartido/reloj.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import { validarFecha } from '../domain/transaccion.js';
import {
  TRANSACCION_REPOSITORY,
  type TransaccionRepository,
} from './transaccion.repository.js';

export interface Resumen {
  desde: string;
  hasta: string;
  moneda: string;
  totalGastos: Monto;
  totalIngresos: Monto;
  balance: Monto;
  porCategoria: {
    categoriaId: string | null;
    nombre: string;
    tipo: TipoMovimiento;
    total: Monto;
  }[];
}

@Injectable()
export class ObtenerResumen {
  constructor(
    @Inject(TRANSACCION_REPOSITORY)
    private readonly repo: TransaccionRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async ejecutar(
    userId: string,
    perfil: { moneda: string; zonaHoraria: string },
    desdeParam?: string,
    hastaParam?: string,
    periodo?: 'mes_anterior',
  ): Promise<Resumen> {
    if (
      periodo !== undefined &&
      (desdeParam !== undefined || hastaParam !== undefined)
    )
      throw new ValidacionError(
        'periodo no se puede combinar con desde/hasta',
        'RANGO_INVALIDO',
      );
    if ((desdeParam === undefined) !== (hastaParam === undefined))
      throw new ValidacionError(
        'Indica desde y hasta juntos, o ninguno',
        'RANGO_INVALIDO',
      );
    let desde: string;
    let hasta: string;
    if (periodo === 'mes_anterior') {
      ({ desde, hasta } = rangoMesAnterior(
        this.reloj.ahora(),
        perfil.zonaHoraria,
      ));
    } else if (desdeParam !== undefined && hastaParam !== undefined) {
      desde = validarFecha(desdeParam);
      hasta = validarFecha(hastaParam);
      if (desde > hasta)
        throw new ValidacionError(
          'desde no puede ser posterior a hasta',
          'RANGO_INVALIDO',
        );
    } else {
      ({ desde, hasta } = rangoMesActual(
        this.reloj.ahora(),
        perfil.zonaHoraria,
      ));
    }

    const { porCategoria } = await this.repo.totales(userId, desde, hasta);
    const suma = (tipo: TipoMovimiento) =>
      porCategoria
        .filter((f) => f.tipo === tipo)
        .reduce((acc, f) => acc + f.centavos, 0);
    const gastos = suma('gasto');
    const ingresos = suma('ingreso');
    return {
      desde,
      hasta,
      moneda: perfil.moneda,
      totalGastos: Monto.desdeCentavos(gastos),
      totalIngresos: Monto.desdeCentavos(ingresos),
      balance: Monto.desdeCentavos(ingresos - gastos),
      porCategoria: porCategoria.map((f) => ({
        categoriaId: f.categoriaId,
        nombre: f.nombre,
        tipo: f.tipo,
        total: Monto.desdeCentavos(f.centavos),
      })),
    };
  }
}
