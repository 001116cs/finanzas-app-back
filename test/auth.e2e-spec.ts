import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import { UsuarioActual } from '../src/compartido/auth/decoradores.js';
import { SinPerfil } from '../src/compartido/perfil-requerido.guard.js';
import { crearAppTest } from './helpers/app.js';

@SinPerfil()
@Controller('protegida-test')
class ProtegidaTestController {
  @Get()
  quien(@UsuarioActual() userId: string) {
    return { userId };
  }
}

@Module({ controllers: [ProtegidaTestController] })
class ProtegidaTestModule {}

describe('autenticación', () => {
  let app: INestApplication;
  const uuid = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';

  beforeAll(async () => {
    app = await crearAppTest([ProtegidaTestModule]);
  });
  afterAll(async () => {
    await app.close();
  });

  it('sin header -> 401 {codigo, mensaje}', async () => {
    const res = await request(app.getHttpServer())
      .get('/protegida-test')
      .expect(401);
    expect(res.body).toEqual({
      codigo: 'NO_AUTENTICADO',
      mensaje: expect.any(String),
    });
  });

  it('Bearer basura -> 401', async () => {
    await request(app.getHttpServer())
      .get('/protegida-test')
      .set('Authorization', 'Bearer basura')
      .expect(401);
  });

  it('token válido deja el userId en el request', async () => {
    const res = await request(app.getHttpServer())
      .get('/protegida-test')
      .set('Authorization', `Bearer token-${uuid}`)
      .expect(200);
    expect(res.body).toEqual({ userId: uuid });
  });

  it('GET /health sin header -> 200', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
