import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  PerfilActual,
  UsuarioActual,
} from '../../compartido/auth/decoradores.js';
import { ESQUEMA_BEARER } from '../../compartido/openapi.js';
import { ErrorRespuesta } from '../../compartido/respuestas.js';
import type { Perfil } from '../../perfil/domain/perfil.js';
import { BuscarDuplicados } from '../application/buscar-duplicados.js';
import { DuplicadosDto } from './dto.js';
import { DuplicadosRespuesta } from './respuestas.js';

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('importaciones')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({ type: ErrorRespuesta, description: 'PERFIL_REQUERIDO' })
@Controller('importaciones')
export class ImportacionesController {
  constructor(
    @Inject(BuscarDuplicados) private readonly duplicados: BuscarDuplicados,
  ) {}

  @ApiOkResponse({ type: DuplicadosRespuesta })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description:
      'LOTE_VACIO, LOTE_DEMASIADO_GRANDE o error de una fila (incluye `fila`)',
  })
  @HttpCode(200)
  @Post('duplicados')
  async postDuplicados(
    @UsuarioActual() userId: string,
    @PerfilActual() perfil: Perfil,
    @Body() dto: DuplicadosDto,
  ): Promise<DuplicadosRespuesta> {
    return {
      indices: await this.duplicados.ejecutar(
        userId,
        perfil.zonaHoraria,
        dto.filas,
      ),
    };
  }
}
