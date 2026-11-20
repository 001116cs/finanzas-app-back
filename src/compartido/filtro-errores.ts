import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictoError,
  NoAutenticadoError,
  NoEncontradoError,
  ValidacionError,
} from './errores.js';

@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger(FiltroErrores.name);

  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, cuerpo } = this.mapear(error);
    res.status(status).json(cuerpo);
  }

  private mapear(error: unknown): {
    status: number;
    cuerpo: { codigo: string; mensaje: string };
  } {
    if (error instanceof NoAutenticadoError)
      return {
        status: 401,
        cuerpo: { codigo: error.codigo, mensaje: error.message },
      };
    if (error instanceof NoEncontradoError)
      return {
        status: 404,
        cuerpo: { codigo: error.codigo, mensaje: error.message },
      };
    if (error instanceof ValidacionError)
      return {
        status: 400,
        cuerpo: { codigo: error.codigo, mensaje: error.message },
      };
    if (error instanceof ConflictoError)
      return {
        status: 409,
        cuerpo: { codigo: error.codigo, mensaje: error.message },
      };
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const resp = error.getResponse();
      const mensaje =
        typeof resp === 'string'
          ? resp
          : Array.isArray((resp as { message?: unknown }).message)
            ? (resp as { message: string[] }).message.join('; ')
            : error.message;
      const codigo =
        status === 400
          ? 'VALIDACION'
          : status === 404
            ? 'NO_ENCONTRADO'
            : `HTTP_${status}`;
      return { status, cuerpo: { codigo, mensaje } };
    }
    this.logger.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    return {
      status: 500,
      cuerpo: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' },
    };
  }
}
