import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type CryptoKey,
} from 'jose';
import { NoAutenticadoError } from '../errores.js';
import { JoseVerificador } from './jose-verificador.js';

const ISSUER = 'https://test.supabase.co/auth/v1';
const SUB = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';

async function nuevaClave() {
  return generateKeyPair('ES256');
}

async function firmar(
  privada: CryptoKey,
  opts: { iss?: string; aud?: string; exp?: string | number } = {},
) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setSubject(SUB)
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(privada);
}

describe('JoseVerificador', () => {
  let privada: CryptoKey;
  let verificador: JoseVerificador;

  beforeAll(async () => {
    const par = await nuevaClave();
    privada = par.privateKey;
    const jwk: JWK = {
      ...(await exportJWK(par.publicKey)),
      kid: 'k1',
      alg: 'ES256',
    };
    verificador = new JoseVerificador(
      createLocalJWKSet({ keys: [jwk] }),
      ISSUER,
    );
  });

  it('token válido devuelve el userId (sub)', async () => {
    const token = await firmar(privada);
    await expect(verificador.verificar(token)).resolves.toEqual({
      userId: SUB,
    });
  });

  it('token expirado lanza NoAutenticadoError', async () => {
    const token = await firmar(privada, {
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(
      NoAutenticadoError,
    );
  });

  it('issuer distinto lanza NoAutenticadoError', async () => {
    const token = await firmar(privada, {
      iss: 'https://otro.example/auth/v1',
    });
    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(
      NoAutenticadoError,
    );
  });

  it('aud distinto lanza NoAutenticadoError', async () => {
    const token = await firmar(privada, { aud: 'anon' });
    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(
      NoAutenticadoError,
    );
  });

  it('firmado con otra clave lanza NoAutenticadoError', async () => {
    const otra = await nuevaClave();
    const token = await firmar(otra.privateKey);
    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(
      NoAutenticadoError,
    );
  });

  it('basura lanza NoAutenticadoError', async () => {
    await expect(verificador.verificar('basura')).rejects.toBeInstanceOf(
      NoAutenticadoError,
    );
  });
});
