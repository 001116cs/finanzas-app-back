import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
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
import { ObtenerBoleta } from '../application/obtener-boleta.js';
import { ObtenerImagenBoleta } from '../application/obtener-imagen-boleta.js';
import { GuardarBoletaDto } from './dto.js';
import {
  BoletaRespuesta,
  GuardarBoletaRespuesta,
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
    @Inject(ObtenerBoleta) private readonly obtener: ObtenerBoleta,
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

  @ApiOkResponse({ type: BoletaRespuesta })
  @ApiNotFoundResponse({ type: ErrorRespuesta })
  @Get(':id')
  async get(
    @UsuarioActual() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BoletaRespuesta> {
    const b = await this.obtener.ejecutar(userId, id);
    return { ...b, createdAt: b.createdAt.toISOString() };
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
