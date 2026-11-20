import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsuarioActual } from '../../compartido/auth/decoradores.js';
import { CrearCategoria } from '../application/crear-categoria.js';
import { ListarCategorias } from '../application/listar-categorias.js';
import { RenombrarCategoria } from '../application/renombrar-categoria.js';
import {
  CrearCategoriaDto,
  ListarCategoriasQuery,
  RenombrarCategoriaDto,
} from './dto.js';

@Controller('categorias')
export class CategoriasController {
  constructor(
    @Inject(CrearCategoria) private readonly crear: CrearCategoria,
    @Inject(ListarCategorias) private readonly listar: ListarCategorias,
    @Inject(RenombrarCategoria) private readonly renombrar: RenombrarCategoria,
  ) {}

  @Get()
  get(@UsuarioActual() userId: string, @Query() q: ListarCategoriasQuery) {
    return this.listar.ejecutar(userId, q.tipo);
  }

  @Post()
  async post(@UsuarioActual() userId: string, @Body() dto: CrearCategoriaDto) {
    const c = await this.crear.ejecutar(userId, dto);
    return { ...c, cantidadMovimientos: 0 };
  }

  @Patch(':id')
  patch(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenombrarCategoriaDto,
  ) {
    return this.renombrar.ejecutar(userId, id, dto.nombre);
  }
}
