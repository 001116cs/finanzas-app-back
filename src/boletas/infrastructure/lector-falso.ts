import type {
  ImagenBoleta,
  LectorDeBoletas,
  ResultadoLectura,
} from '../application/lector-de-boletas.js';

export class LectorFalso implements LectorDeBoletas {
  leer(
    _imagen: ImagenBoleta,
    _categorias: string[],
  ): Promise<ResultadoLectura> {
    return Promise.resolve({
      tipo: 'ok',
      cruda: {
        esBoleta: true,
        comercio: 'Supermercado Demo',
        fecha: '2026-11-20',
        totalImpreso: 23.4,
        productos: [
          { descripcion: 'Leche', monto: 4.5, categoria: 'Comida' },
          { descripcion: 'Pan', monto: 3.9, categoria: 'Comida' },
          { descripcion: 'Detergente', monto: 15, categoria: 'Hogar' },
        ],
      },
      uso: {
        modelo: 'claude-sonnet-5-5',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    });
  }
}
