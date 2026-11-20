import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import { NoAutenticadoError } from '../errores.js';
import type { VerificadorDeToken } from './verificador-de-token.js';

export class JoseVerificador implements VerificadorDeToken {
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
      if (!payload.sub) throw new Error('sin sub');
      return { userId: payload.sub };
    } catch {
      throw new NoAutenticadoError('Token inválido o expirado');
    }
  }
}
