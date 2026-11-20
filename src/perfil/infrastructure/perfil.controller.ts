import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ErrorRespuesta } from '../../compartido/respuestas.js';
import { ESQUEMA_BEARER } from '../../compartido/openapi.js';
import { PerfilRespuesta } from './respuestas.js';
import type { Response } from 'express';
import { UsuarioActual } from '../../compartido/auth/decoradores.js';
import { SinPerfil } from '../../compartido/perfil-requerido.guard.js';
import { ActualizarPerfil } from '../application/actualizar-perfil.js';
import { CrearPerfil } from '../application/crear-perfil.js';
import { ObtenerPerfil } from '../application/obtener-perfil.js';
import { ActualizarPerfilDto, CrearPerfilDto } from './dto.js';

@SinPerfil()
@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('perfil')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@Controller('perfil')
export class PerfilController {
  constructor(
    @Inject(CrearPerfil) private readonly crear: CrearPerfil,
    @Inject(ObtenerPerfil) private readonly obtener: ObtenerPerfil,
    @Inject(ActualizarPerfil) private readonly actualizar: ActualizarPerfil,
  ) {}

  @ApiCreatedResponse({ type: PerfilRespuesta, description: 'Perfil creado' })
  @ApiOkResponse({
    type: PerfilRespuesta,
    description: 'El perfil ya existía; sin cambios',
  })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @Post()
  async post(
    @UsuarioActual() userId: string,
    @Body() dto: CrearPerfilDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { creado, perfil } = await this.crear.ejecutar(userId, dto);
    res.status(creado ? 201 : 200);
    return perfil;
  }

  @ApiOkResponse({ type: PerfilRespuesta })
  @ApiConflictResponse({
    type: ErrorRespuesta,
    description: 'PERFIL_REQUERIDO',
  })
  @Get()
  get(@UsuarioActual() userId: string) {
    return this.obtener.ejecutar(userId);
  }

  @ApiOkResponse({ type: PerfilRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @ApiConflictResponse({
    type: ErrorRespuesta,
    description: 'PERFIL_REQUERIDO',
  })
  @Patch()
  patch(@UsuarioActual() userId: string, @Body() dto: ActualizarPerfilDto) {
    return this.actualizar.ejecutar(userId, dto);
  }
}
