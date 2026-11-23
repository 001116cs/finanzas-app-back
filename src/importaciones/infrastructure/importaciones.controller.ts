import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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
import { DeshacerImportacion } from '../application/deshacer-importacion.js';
import { GuardarImportacion } from '../application/guardar-importacion.js';
import { ListarImportaciones } from '../application/listar-importaciones.js';
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
    @Inject(ListarImportaciones) private readonly listar: ListarImportaciones,
    @Inject(DeshacerImportacion) private readonly deshacer: DeshacerImportacion,
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

  @ApiOkResponse({
    type: [ImportacionRespuesta],
    description: 'Importaciones del usuario, la más reciente primero',
  })
  @Get()
  async get(@UsuarioActual() userId: string): Promise<ImportacionRespuesta[]> {
    const lista = await this.listar.ejecutar(userId);
    return lista.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));
  }

  @ApiNoContentResponse({
    description:
      'Importación deshecha: se borran todos sus movimientos (aunque se hayan editado); las categorías creadas se conservan',
  })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deshacer.ejecutar(userId, id);
  }
}
