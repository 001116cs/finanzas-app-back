import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { GuardarImportacion } from '../application/guardar-importacion.js';
import { DuplicadosDto, ImportacionDto } from './dto.js';
import { DuplicadosRespuesta, ImportacionRespuesta } from './respuestas.js';

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('importaciones')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({ type: ErrorRespuesta, description: 'PERFIL_REQUERIDO' })
@Controller('importaciones')
export class ImportacionesController {
  constructor(
    @Inject(BuscarDuplicados) private readonly duplicados: BuscarDuplicados,
    @Inject(GuardarImportacion) private readonly guardar: GuardarImportacion,
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

  @ApiCreatedResponse({ type: ImportacionRespuesta })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description:
      'LOTE_VACIO, LOTE_DEMASIADO_GRANDE, CATEGORIA_NUEVA_INVALIDA, CATEGORIA_INCOMPATIBLE o error de una fila (incluye `fila`, 0-based); no se guarda nada',
  })
  @Post()
  async post(
    @UsuarioActual() userId: string,
    @PerfilActual() perfil: Perfil,
    @Body() dto: ImportacionDto,
  ): Promise<ImportacionRespuesta> {
    const i = await this.guardar.ejecutar(userId, perfil.zonaHoraria, dto);
    return { ...i, createdAt: i.createdAt.toISOString() };
  }
}
