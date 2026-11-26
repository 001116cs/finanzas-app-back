import { describe, expect, it } from 'vitest';
import { ConflictoError } from '../../compartido/errores.js';
import type { UsoIaRepository } from './uso-ia.repository.js';
import { ObtenerUsoIa } from './obtener-uso-ia.js';
import { RegistrarUsoBoleta } from './registrar-uso-boleta.js';
import { ReservarCupoBoleta } from './reservar-cupo-boleta.js';

const AHORA = new Date('2026-12-01T03:00:00Z'); // Lima: 2026-11; UTC: 2026-12
const reloj = { ahora: () => AHORA };
const config = { limiteBoletas: 20, limiteFallidos: 10, presupuestoUsd: 10 };
const U = 'u1';

class RepoMemoria implements UsoIaRepository {
  usuario = { boletasUsadas: 0, preguntasUsadas: 0, intentosFallidos: 0 };
  global = 0;
  llamadas: unknown[][] = [];
  obtener = async () => this.usuario;
  costoGlobal = async () => this.global;
  reservarBoleta = async (
    userId: string,
    mes: string,
    limite: number,
    limiteFallidos: number,
  ) => {
    this.llamadas.push(['reservar', userId, mes, limite, limiteFallidos]);
    if (
      this.usuario.boletasUsadas >= limite ||
      this.usuario.intentosFallidos >= limiteFallidos
    ) {
      return false;
    }
    this.usuario.boletasUsadas++;
    return true;
  };
  confirmarBoleta = async (...a: [string, number]) => {
    this.llamadas.push(['confirmar', ...a]);
  };
  liberarComoFallo = async (...a: [string, string, string, number]) => {
    this.llamadas.push(['fallo', ...a]);
  };
  liberar = async (...a: [string, string]) => {
    this.llamadas.push(['liberar', ...a]);
  };
}

describe('ReservarCupoBoleta', () => {
  it('con cupo reserva y devuelve el mes del usuario', async () => {
    const r = new RepoMemoria();
    const res = await new ReservarCupoBoleta(r, reloj, config).ejecutar(
      U,
      'America/Lima',
    );
    expect(res).toEqual({ mes: '2026-11' });
    expect(r.llamadas).toEqual([['reservar', U, '2026-11', 20, 10]]);
  });
  it.each([
    ['LIMITE_BOLETAS', { boletasUsadas: 20 }, 0],
    ['LIMITE_INTENTOS_FALLIDOS', { intentosFallidos: 10 }, 0],
    ['LIMITE_BOLETAS', { boletasUsadas: 20, intentosFallidos: 10 }, 0],
  ])('lanza ConflictoError %s', async (codigo, usuario, global) => {
    const r = new RepoMemoria();
    Object.assign(r.usuario, usuario);
    r.global = global;
    const err = await new ReservarCupoBoleta(r, reloj, config)
      .ejecutar(U, 'America/Lima')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictoError);
    expect((err as ConflictoError).codigo).toBe(codigo);
  });
  it('tope global: lanza sin intentar reservar (prioridad global)', async () => {
    const r = new RepoMemoria();
    r.global = 10;
    r.usuario.boletasUsadas = 20;
    const err = await new ReservarCupoBoleta(r, reloj, config)
      .ejecutar(U, 'America/Lima')
      .catch((e: unknown) => e);
    expect((err as ConflictoError).codigo).toBe('LIMITE_GLOBAL_IA');
    expect(r.llamadas).toEqual([]);
  });
});

describe('RegistrarUsoBoleta', () => {
  const uso = {
    modelo: 'claude-sonnet-5-5',
    inputTokens: 1_000_000,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
  it('éxito confirma con mes UTC y costo', async () => {
    const r = new RepoMemoria();
    await new RegistrarUsoBoleta(r, reloj).exito('2026-11', uso);
    expect(r.llamadas).toEqual([['confirmar', '2026-12', 2]]);
  });
  it('fallo libera como fallo con el mes reservado', async () => {
    const r = new RepoMemoria();
    await new RegistrarUsoBoleta(r, reloj).fallo(U, '2026-11', uso);
    expect(r.llamadas).toEqual([['fallo', U, '2026-11', '2026-12', 2]]);
  });
  it('cancelar libera la reserva', async () => {
    const r = new RepoMemoria();
    await new RegistrarUsoBoleta(r, reloj).cancelar(U, '2026-11');
    expect(r.llamadas).toEqual([['liberar', U, '2026-11']]);
  });
});

describe('ObtenerUsoIa', () => {
  it('devuelve la forma esperada', async () => {
    const r = new RepoMemoria();
    r.usuario = { boletasUsadas: 5, preguntasUsadas: 0, intentosFallidos: 2 };
    r.global = 10;
    expect(
      await new ObtenerUsoIa(r, reloj, config).ejecutar(U, 'America/Lima'),
    ).toEqual({
      mes: '2026-11',
      boletas: { usadas: 5, limite: 20 },
      intentosFallidos: { usados: 2, limite: 10 },
      globalAgotado: true,
    });
  });
  it('globalAgotado false bajo presupuesto', async () => {
    const r = new RepoMemoria();
    r.global = 9.99;
    const o = await new ObtenerUsoIa(r, reloj, config).ejecutar(
      U,
      'America/Lima',
    );
    expect(o.globalAgotado).toBe(false);
  });
});
