import type { INestApplication } from '@nestjs/common';
import { configurarApp } from './configurar-app.js';

describe('configurarApp', () => {
  it('quita la barra final de FRONT_URL en el origen CORS', () => {
    const enableCors = vi.fn();
    const app = {
      useGlobalPipes: vi.fn(),
      enableCors,
    } as unknown as INestApplication;
    configurarApp(app, 'https://front.example.com/');
    expect(enableCors).toHaveBeenCalledWith({
      origin: ['https://front.example.com'],
    });
  });
});
