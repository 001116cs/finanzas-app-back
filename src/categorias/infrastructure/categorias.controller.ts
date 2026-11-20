import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Get,
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
import { CategoriaRespuesta } from './respuestas.js';
import { UsuarioActual } from '../../compartido/auth/decoradores.js';
import { CrearCategoria } from '../application/crear-categoria.js';
import { EliminarCategoria } from '../application/eliminar-categoria.js';
import { ListarCategorias } from '../application/listar-categorias.js';
import { RenombrarCategoria } from '../application/renombrar-categoria.js';
import {
  CrearCategoriaDto,
  EliminarCategoriaQuery,
  ListarCategoriasQuery,
  RenombrarCategoriaDto,
} from './dto.js';

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('categorias')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({ type: ErrorRespuesta, description: 'PERFIL_REQUERIDO' })
@Controller('categorias')
export class CategoriasController {
  constructor(
    @Inject(CrearCategoria) private readonly crear: CrearCategoria,
    @Inject(ListarCategorias) private readonly listar: ListarCategorias,
    @Inject(RenombrarCategoria) private readonly renombrar: RenombrarCategoria,
    @Inject(EliminarCategoria) private readonly eliminar: EliminarCategoria,
  ) {}

  @ApiOkResponse({ type: () => [CategoriaRespuesta] })
  @Get()
  get(@UsuarioActual() userId: string, @Query() q: ListarCategoriasQuery) {
    return this.listar.ejecutar(userId, q.tipo);
  }

  @ApiCreatedResponse({ type: CategoriaRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @ApiConflictResponse({
    type: ErrorRespuesta,
    description: 'CATEGORIA_DUPLICADA o PERFIL_REQUERIDO',
  })
  @Post()
  async post(@UsuarioActual() userId: string, @Body() dto: CrearCategoriaDto) {
    const c = await this.crear.ejecutar(userId, dto);
    return { ...c, cantidadMovimientos: 0 };
  }

  @ApiOkResponse({ type: CategoriaRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Patch(':id')
  patch(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenombrarCategoriaDto,
  ) {
    return this.renombrar.ejecutar(userId, id, dto.nombre);
  }

  @ApiNoContentResponse({ description: 'Categoría eliminada' })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description: 'MODO_REQUERIDO u otro dato inválido',
  })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: EliminarCategoriaQuery,
  ): Promise<void> {
    await this.eliminar.ejecutar(userId, id, q.modo, q.destinoId);
  }
}
