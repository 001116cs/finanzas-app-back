import { Controller, Get } from '@nestjs/common';
import { Publico } from '../compartido/auth/decoradores.js';

@Controller('health')
export class HealthController {
  @Publico()
  @Get()
  estado() {
    return { status: 'ok' };
  }
}
