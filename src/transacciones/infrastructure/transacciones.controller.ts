import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ErrorRespuesta } from '../../compartido/respuestas.js';
import { ESQUEMA_BEARER } from '../../compartido/openapi.js';
import {
  ListaTransaccionesRespuesta,
  TransaccionRespuesta,
} from './respuestas.js';
import { UsuarioActual } from '../../compartido/auth/decoradores.js';
import { CrearTransaccion } from '../application/crear-transaccion.js';
import { EditarTransaccion } from '../application/editar-transaccion.js';
import { EliminarTransaccion } from '../application/eliminar-transaccion.js';
import { ListarTransacciones } from '../application/listar-transacciones.js';
import type { Transaccion } from '../domain/transaccion.js';
import {
  CrearTransaccionDto,
  EditarTransaccionDto,
  ListarTransaccionesQuery,
} from './dto.js';

function presentar(t: Transaccion) {
  return {
    id: t.id,
    tipo: t.tipo,
    monto: t.monto.aTexto(),
    fecha: t.fecha,
    descripcion: t.descripcion,
    categoriaId: t.categoriaId,
    categoriaNombre: t.categoriaNombre,
    origen: t.origen,
    boletaId: t.boletaId ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('transacciones')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({ type: ErrorRespuesta, description: 'PERFIL_REQUERIDO' })
@Controller('transacciones')
export class TransaccionesController {
  constructor(
    @Inject(CrearTransaccion) private readonly crear: CrearTransaccion,
    @Inject(ListarTransacciones) private readonly listar: ListarTransacciones,
    @Inject(EditarTransaccion) private readonly editar: EditarTransaccion,
    @Inject(EliminarTransaccion) private readonly eliminar: EliminarTransaccion,
  ) {}

  @ApiCreatedResponse({ type: TransaccionRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @Post()
  async post(
    @UsuarioActual() userId: string,
    @Body() dto: CrearTransaccionDto,
  ) {
    return presentar(await this.crear.ejecutar(userId, dto));
  }

  @ApiOkResponse({ type: ListaTransaccionesRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @Get()
  async get(
    @UsuarioActual() userId: string,
    @Query() q: ListarTransaccionesQuery,
  ) {
    const { items, total } = await this.listar.ejecutar(userId, q);
    return { items: items.map(presentar), total };
  }

  @ApiOkResponse({ type: TransaccionRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Patch(':id')
  async patch(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarTransaccionDto,
  ) {
    return presentar(await this.editar.ejecutar(userId, id, dto));
  }

  @ApiNoContentResponse({ description: 'Transacción eliminada' })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.eliminar.ejecutar(userId, id);
  }
}
