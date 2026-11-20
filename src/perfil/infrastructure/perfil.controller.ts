import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsuarioActual } from '../../compartido/auth/decoradores.js';
import { SinPerfil } from '../../compartido/perfil-requerido.guard.js';
import { ActualizarPerfil } from '../application/actualizar-perfil.js';
import { CrearPerfil } from '../application/crear-perfil.js';
import { ObtenerPerfil } from '../application/obtener-perfil.js';
import { ActualizarPerfilDto, CrearPerfilDto } from './dto.js';

@SinPerfil()
@Controller('perfil')
export class PerfilController {
  constructor(
    @Inject(CrearPerfil) private readonly crear: CrearPerfil,
    @Inject(ObtenerPerfil) private readonly obtener: ObtenerPerfil,
    @Inject(ActualizarPerfil) private readonly actualizar: ActualizarPerfil,
  ) {}

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

  @Get()
  get(@UsuarioActual() userId: string) {
    return this.obtener.ejecutar(userId);
  }

  @Patch()
  patch(@UsuarioActual() userId: string, @Body() dto: ActualizarPerfilDto) {
    return this.actualizar.ejecutar(userId, dto);
  }
}
