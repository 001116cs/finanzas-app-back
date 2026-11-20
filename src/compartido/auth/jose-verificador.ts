import { Logger } from '@nestjs/common';
import { errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import {
  NoAutenticadoError,
  ServicioNoDisponibleError,
} from '../errores.js';
import type { VerificadorDeToken } from './verificador-de-token.js';

/**
 * Un fallo es de infraestructura (no del token) si no es un error de jose, o si
 * es de jose pero relativo a obtener/leer el JWKS (timeout, JWKS inválido, HTTP
 * no 200 o respuesta no JSON, que jose lanza como JOSEError genérico).
 */
function esFalloDeInfraestructura(e: unknown): boolean {
  if (!(e instanceof errors.JOSEError)) return !(e instanceof SinSub);
  return (
    e instanceof errors.JWKSTimeout ||
    e instanceof errors.JWKSInvalid ||
    e.code === errors.JOSEError.code
  );
}

class SinSub extends Error {}

export class JoseVerificador implements VerificadorDeToken {
  private readonly logger = new Logger(JoseVerificador.name);

  constructor(
    private readonly jwks: JWTVerifyGetKey,
    private readonly issuer: string,
  ) {}

  async verificar(token: string): Promise<{ userId: string }> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
      });
      if (!payload.sub) throw new SinSub('sin sub');
      return { userId: payload.sub };
    } catch (e) {
      if (esFalloDeInfraestructura(e)) {
        this.logger.error(
          `No se pudo verificar el token por un fallo de infraestructura: ${
            e instanceof Error ? (e.stack ?? e.message) : String(e)
          }`,
        );
        throw new ServicioNoDisponibleError();
      }
      throw new NoAutenticadoError('Token inválido o expirado');
    }
  }
}
