import type { INestApplication } from '@nestjs/common';
import { configurarApp, LIMITE_JSON } from './configurar-app.js';

describe('configurarApp', () => {
  function falsa() {
    const enableCors = vi.fn();
    const useBodyParser = vi.fn();
    const app = {
      useGlobalPipes: vi.fn(),
      useBodyParser,
      enableCors,
    } as unknown as INestApplication;
    return { app, enableCors, useBodyParser };
  }

  it('quita la barra final de FRONT_URL en el origen CORS', () => {
    const { app, enableCors } = falsa();
    configurarApp(app, 'https://front.example.com/');
    expect(enableCors).toHaveBeenCalledWith({
      origin: ['https://front.example.com'],
    });
  });

  it('sube el límite del cuerpo JSON para lotes de 2.000 filas', () => {
    const { app, useBodyParser } = falsa();
    configurarApp(app, 'https://front.example.com');
    expect(useBodyParser).toHaveBeenCalledWith('json', { limit: LIMITE_JSON });
  });
});
