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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Response } from 'express';
import {
  PerfilActual,
  UsuarioActual,
} from '../../compartido/auth/decoradores.js';
import { ValidacionError } from '../../compartido/errores.js';
import { MAX_BYTES_IMAGEN } from '../../compartido/imagen.js';
import { ESQUEMA_BEARER } from '../../compartido/openapi.js';
import { ErrorRespuesta } from '../../compartido/respuestas.js';
import type { Perfil } from '../../perfil/domain/perfil.js';
import { EliminarBoleta } from '../application/eliminar-boleta.js';
import { EscanearBoleta } from '../application/escanear-boleta.js';
import { GuardarBoleta } from '../application/guardar-boleta.js';
import { AgregarGastoBoleta } from '../application/agregar-gasto-boleta.js';
import { EditarBoleta } from '../application/editar-boleta.js';
import { ListarBoletas } from '../application/listar-boletas.js';
import { ObtenerDetalleBoleta } from '../application/obtener-detalle-boleta.js';
import type { Transaccion } from '../../transacciones/domain/transaccion.js';
import { TransaccionRespuesta } from '../../transacciones/infrastructure/respuestas.js';
import { ObtenerImagenBoleta } from '../application/obtener-imagen-boleta.js';
import {
  EditarBoletaDto,
  GastoBoletaDto,
  GuardarBoletaDto,
  ListarBoletasQuery,
} from './dto.js';
import {
  DetalleBoletaRespuesta,
  GuardarBoletaRespuesta,
  ListaBoletasRespuesta,
  LecturaBoletaRespuesta,
} from './respuestas.js';

type Archivo = { buffer: Buffer } | undefined;

const ESQUEMA_ARCHIVO = {
  type: 'object',
  required: ['imagen'],
  properties: {
    imagen: {
      type: 'string',
      format: 'binary',
      description: 'JPEG, PNG o WebP, máx. 5 MB',
    },
  },
};

function presentarGasto(t: Transaccion): TransaccionRespuesta {
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

function bytesDe(file: Archivo): Uint8Array {
  if (!file) throw new ValidacionError('Falta la imagen', 'IMAGEN_INVALIDA');
  return new Uint8Array(file.buffer);
}

async function parsearDatos(texto: unknown): Promise<GuardarBoletaDto> {
  let crudo: unknown;
  try {
    crudo = JSON.parse(String(texto));
  } catch {
    throw new ValidacionError('datos no es JSON válido', 'VALIDACION');
  }
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo))
    throw new ValidacionError('datos debe ser un objeto JSON', 'VALIDACION');
  const dto = plainToInstance(GuardarBoletaDto, crudo);
  const errores = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errores.length > 0) {
    const detalle = errores.flatMap((e) => flatten(e)).join('; ');
    throw new ValidacionError(`datos inválidos: ${detalle}`, 'VALIDACION');
  }
  return dto;
}

function flatten(
  e: Awaited<ReturnType<typeof validate>>[number],
  prefijo = '',
): string[] {
  const ruta = prefijo ? `${prefijo}.${e.property}` : e.property;
  const propios = Object.values(e.constraints ?? {}).map((m) =>
    prefijo || e.constraints ? m : `${ruta}: ${m}`,
  );
  const hijos = (e.children ?? []).flatMap((h) => flatten(h, ruta));
  return [...propios, ...hijos];
}

@ApiBearerAuth(ESQUEMA_BEARER)
@ApiTags('boletas')
@ApiUnauthorizedResponse({ type: ErrorRespuesta })
@ApiConflictResponse({
  type: ErrorRespuesta,
  description:
    'PERFIL_REQUERIDO (en escanear también LIMITE_BOLETAS, LIMITE_INTENTOS_FALLIDOS o LIMITE_GLOBAL_IA)',
})
@Controller('boletas')
export class BoletasController {
  constructor(
    @Inject(EscanearBoleta) private readonly escanear: EscanearBoleta,
    @Inject(GuardarBoleta) private readonly guardar: GuardarBoleta,
    @Inject(ObtenerDetalleBoleta)
    private readonly detalle: ObtenerDetalleBoleta,
    @Inject(ListarBoletas) private readonly listar: ListarBoletas,
    @Inject(EditarBoleta) private readonly editar: EditarBoleta,
    @Inject(AgregarGastoBoleta)
    private readonly agregarGasto: AgregarGastoBoleta,
    @Inject(ObtenerImagenBoleta) private readonly imagen: ObtenerImagenBoleta,
    @Inject(EliminarBoleta) private readonly eliminar: EliminarBoleta,
  ) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: ESQUEMA_ARCHIVO })
  @ApiOkResponse({
    type: LecturaBoletaRespuesta,
    description:
      'Lectura de la boleta; no se guarda nada (sólo se cuenta el uso)',
  })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description: 'IMAGEN_INVALIDA',
  })
  @ApiResponse({
    status: 422,
    type: ErrorRespuesta,
    description: 'BOLETA_ILEGIBLE',
  })
  @ApiResponse({
    status: 503,
    type: ErrorRespuesta,
    description: 'IA_NO_DISPONIBLE',
  })
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: MAX_BYTES_IMAGEN } }),
  )
  @HttpCode(200)
  @Post('escanear')
  async postEscanear(
    @UsuarioActual() userId: string,
    @PerfilActual() perfil: Perfil,
    @UploadedFile() file: Archivo,
  ): Promise<LecturaBoletaRespuesta> {
    const l = await this.escanear.ejecutar(
      userId,
      perfil.zonaHoraria,
      bytesDe(file),
    );
    return {
      comercio: l.comercio,
      fecha: l.fecha,
      totalImpreso: l.totalImpreso,
      productos: l.productos.map((p) => ({
        descripcion: p.descripcion,
        monto: p.monto,
        categoriaId: p.categoriaId,
      })),
    };
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['imagen', 'datos'],
      properties: {
        ...ESQUEMA_ARCHIVO.properties,
        datos: {
          type: 'string',
          description:
            'JSON de GuardarBoletaDto: { comercio, fecha, totalImpreso, productos: [{ descripcion, monto, categoriaId }] }',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: GuardarBoletaRespuesta })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description:
      'IMAGEN_INVALIDA, VALIDACION, COMERCIO_INVALIDO, PRODUCTOS_INVALIDOS, FECHA_INVALIDA o error de un producto (incluye `fila`); no se guarda nada',
  })
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: MAX_BYTES_IMAGEN } }),
  )
  @Post()
  async post(
    @UsuarioActual() userId: string,
    @PerfilActual() perfil: Perfil,
    @UploadedFile() file: Archivo,
    @Body() body: { datos?: unknown },
  ): Promise<GuardarBoletaRespuesta> {
    const bytes = bytesDe(file);
    const dto = await parsearDatos(body?.datos);
    return this.guardar.ejecutar(userId, perfil.zonaHoraria, bytes, dto);
  }

  @ApiOkResponse({ type: ListaBoletasRespuesta })
  @ApiBadRequestResponse({ type: ErrorRespuesta })
  @Get()
  async getLista(
    @UsuarioActual() userId: string,
    @Query() q: ListarBoletasQuery,
  ): Promise<ListaBoletasRespuesta> {
    const { items, total } = await this.listar.ejecutar(
      userId,
      q.pagina,
      q.tamano,
    );
    return {
      items: items.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
      total,
    };
  }

  private async presentarDetalle(
    userId: string,
    id: string,
  ): Promise<DetalleBoletaRespuesta> {
    const b = await this.detalle.ejecutar(userId, id);
    return {
      ...b,
      createdAt: b.createdAt.toISOString(),
      gastos: b.gastos.map(presentarGasto),
    };
  }

  @ApiOkResponse({ type: DetalleBoletaRespuesta })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Get(':id')
  async get(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DetalleBoletaRespuesta> {
    return this.presentarDetalle(userId, id);
  }

  @ApiOkResponse({
    type: DetalleBoletaRespuesta,
    description:
      'Boleta actualizada; si cambia la fecha, también la de todos sus gastos',
  })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description:
      'VALIDACION (incluye body sin campos), COMERCIO_INVALIDO, FECHA_INVALIDA o MONTO_INVALIDO',
  })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Patch(':id')
  async patch(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarBoletaDto,
  ): Promise<DetalleBoletaRespuesta> {
    await this.editar.ejecutar(userId, id, {
      comercio: dto.comercio,
      fecha: dto.fecha,
      totalImpreso: dto.totalImpreso,
    });
    return this.presentarDetalle(userId, id);
  }

  @ApiCreatedResponse({
    type: TransaccionRespuesta,
    description: 'Gasto creado con la fecha de la boleta',
  })
  @ApiBadRequestResponse({
    type: ErrorRespuesta,
    description: 'VALIDACION, MONTO_INVALIDO o CATEGORIA_INCOMPATIBLE',
  })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Post(':id/gastos')
  async postGasto(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GastoBoletaDto,
  ): Promise<TransaccionRespuesta> {
    return presentarGasto(await this.agregarGasto.ejecutar(userId, id, dto));
  }

  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({
    description: 'Bytes de la imagen original de la boleta',
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Get(':id/imagen')
  async getImagen(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { bytes, contentType } = await this.imagen.ejecutar(userId, id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(bytes);
  }

  @ApiNoContentResponse({
    description:
      'Boleta e imagen eliminadas; los gastos creados se conservan sin enlace a la boleta',
  })
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
