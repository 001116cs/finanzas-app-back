import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Publico } from '../compartido/auth/decoradores.js';
import { SinPerfil } from '../compartido/perfil-requerido.guard.js';

@SinPerfil()
@ApiTags('health')
@Controller('health')
export class HealthController {
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
      required: ['status'],
    },
  })
  @Publico()
  @Get()
  estado() {
    return { status: 'ok' };
  }
}
