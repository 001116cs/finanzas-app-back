import { Controller, Get, Inject } from '@nestjs/common';
import {
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
import { ObtenerUsoIa } from '../application/obtener-uso-ia.js';
import { UsoIaRespuesta } from './respuestas.js';

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('uso-ia')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({ type: ErrorRespuesta, description: 'PERFIL_REQUERIDO' })
@Controller('uso-ia')
export class UsoIaController {
  constructor(@Inject(ObtenerUsoIa) private readonly obtener: ObtenerUsoIa) {}

  @ApiOkResponse({
    type: UsoIaRespuesta,
    description: 'Uso de IA del usuario en el mes actual y sus límites',
  })
  @Get()
  get(
    @UsuarioActual() userId: string,
    @PerfilActual() perfil: Perfil,
  ): Promise<UsoIaRespuesta> {
    return this.obtener.ejecutar(userId, perfil.zonaHoraria);
  }
}
