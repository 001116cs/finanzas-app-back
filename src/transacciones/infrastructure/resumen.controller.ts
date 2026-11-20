import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ErrorRespuesta } from '../../compartido/respuestas.js';
import { ESQUEMA_BEARER } from '../../compartido/openapi.js';
import { ResumenRespuesta } from './respuestas.js';
import {
  PerfilActual,
  UsuarioActual,
} from '../../compartido/auth/decoradores.js';
import type { Perfil } from '../../perfil/domain/perfil.js';
import { ObtenerResumen } from '../application/obtener-resumen.js';
import { ResumenQuery } from './dto.js';

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('resumen')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({ type: ErrorRespuesta, description: 'PERFIL_REQUERIDO' })
@Controller('resumen')
export class ResumenController {
  constructor(
    @Inject(ObtenerResumen) private readonly resumen: ObtenerResumen,
  ) {}

  @ApiOkResponse({ type: ResumenRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @Get()
  async get(
    @UsuarioActual() userId: string,
    @PerfilActual() perfil: Perfil,
    @Query() q: ResumenQuery,
  ) {
    const r = await this.resumen.ejecutar(userId, perfil, q.desde, q.hasta);
    return {
      desde: r.desde,
      hasta: r.hasta,
      moneda: r.moneda,
      totalGastos: r.totalGastos.aTexto(),
      totalIngresos: r.totalIngresos.aTexto(),
      balance: r.balance.aTexto(),
      porCategoria: r.porCategoria.map((c) => ({
        categoriaId: c.categoriaId,
        nombre: c.nombre,
        tipo: c.tipo,
        total: c.total.aTexto(),
      })),
    };
  }
}
