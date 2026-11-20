import { Controller, Get } from '@nestjs/common';
import { Publico } from '../compartido/auth/decoradores.js';
import { SinPerfil } from '../compartido/perfil-requerido.guard.js';

@SinPerfil()
@Controller('health')
export class HealthController {
  @Publico()
  @Get()
  estado() {
    return { status: 'ok' };
  }
}
