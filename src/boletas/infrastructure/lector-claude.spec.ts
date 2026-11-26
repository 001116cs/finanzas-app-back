import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { IaNoDisponibleError } from '../../compartido/errores.js';
import { LectorClaude } from './lector-claude.js';

const imagen = {
  bytes: new Uint8Array([1, 2, 3]),
  mediaType: 'image/jpeg' as const,
};
const usage = {
  input_tokens: 100,
  output_tokens: 50,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: 7,
};
const cruda = {
  esBoleta: true,
  comercio: 'Tienda',
  fecha: null,
  totalImpreso: 5,
  productos: [{ descripcion: 'Pan', monto: 5, categoria: 'Comida' }],
};

function montar(respuesta: object) {
  const parse = vi.fn(async () => {
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  });
  const cliente = {
    beta: { messages: { create: parse } },
  } as unknown as Anthropic;
  return { lector: new LectorClaude(cliente, 'claude-sonnet-5-5'), parse };
}

const texto = (t: string) => [{ type: 'text', text: t }];
const ok = {
  model: 'claude-sonnet-5-5',
  content: texto(JSON.stringify(cruda)),
  stop_reason: 'end_turn',
  usage,
};

describe('LectorClaude', () => {
  it('arma la petición con modelo, límites, imagen primero y categorías', async () => {
    const { lector, parse } = montar(ok);
    await lector.leer(imagen, ['Comida', 'Hogar']);
    const p = (parse.mock.calls[0] as unknown[])[0] as any;
    expect(p.model).toBe('claude-sonnet-5-5');
    expect(p.max_tokens).toBe(16000);
    expect(p.output_config.effort).toBe('low');
    expect(p.output_config.format.type).toBe('json_schema');
    expect(p.output_config.format.schema.additionalProperties).toBe(false);
    expect(p.output_config.format.schema.required).toContain('esBoleta');
    expect(p.temperature).toBeUndefined();
    expect(p.thinking).toBeUndefined();
    const [primero, segundo] = p.messages[0].content;
    expect(primero).toEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: Buffer.from(imagen.bytes).toString('base64'),
      },
    });
    expect(segundo.type).toBe('text');
    expect(segundo.text).toContain('Comida\nHogar');
  });

  it('con fallback del servidor cobra al modelo que respondió', async () => {
    const { lector } = montar({ ...ok, model: 'claude-opus-5-5' });
    const r = await lector.leer(imagen, []);
    expect(r.uso.modelo).toBe('claude-opus-5-5');
  });

  it('si el modelo que respondió no tiene precio, cobra al más caro', async () => {
    const { lector } = montar({ ...ok, model: 'claude-sonnet-5' });
    const r = await lector.leer(imagen, []);
    expect(r.uso.modelo).toBe('claude-opus-5-5');
  });

  it('respuesta válida → ok con uso mapeado', async () => {
    const { lector } = montar(ok);
    const r = await lector.leer(imagen, []);
    expect(r).toEqual({
      tipo: 'ok',
      cruda,
      uso: {
        modelo: 'claude-sonnet-5-5',
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 7,
      },
    });
  });

  it('sin categorías lo indica en el texto', async () => {
    const { lector, parse } = montar(ok);
    await lector.leer(imagen, []);
    const p = (parse.mock.calls[0] as unknown[])[0] as any;
    expect(p.messages[0].content[1].text).toContain('(sin categorías)');
  });

  it.each([
    [
      'esBoleta=false',
      { ...ok, content: texto(JSON.stringify({ ...cruda, esBoleta: false })) },
    ],
    [
      'max_tokens con JSON truncado',
      { ...ok, stop_reason: 'max_tokens', content: texto('{"esBoleta": tr') },
    ],
    [
      'refusal con texto',
      { ...ok, stop_reason: 'refusal', content: texto('No puedo ayudar') },
    ],
    [
      'JSON que no cumple el esquema',
      { ...ok, content: texto(JSON.stringify({ esBoleta: true })) },
    ],
    ['texto no JSON', { ...ok, content: texto('hola') }],
    ['sin bloques de texto', { ...ok, content: [] }],
  ])('%s → ilegible con uso', async (_n, resp) => {
    const { lector } = montar(resp);
    const r = await lector.leer(imagen, []);
    expect(r.tipo).toBe('ilegible');
    expect(r.uso.inputTokens).toBe(100);
    expect(r.uso.outputTokens).toBe(50);
  });

  it('error 529 del SDK → IaNoDisponibleError', async () => {
    const { lector } = montar(
      new Anthropic.InternalServerError(
        529,
        undefined,
        'overloaded',
        new Headers(),
      ),
    );
    await expect(lector.leer(imagen, [])).rejects.toBeInstanceOf(
      IaNoDisponibleError,
    );
  });

  it('error de conexión → IaNoDisponibleError', async () => {
    const { lector } = montar(new Anthropic.APIConnectionError({}));
    await expect(lector.leer(imagen, [])).rejects.toBeInstanceOf(
      IaNoDisponibleError,
    );
  });

  it('otros errores se relanzan', async () => {
    const { lector } = montar(new TypeError('boom'));
    await expect(lector.leer(imagen, [])).rejects.toBeInstanceOf(TypeError);
  });
});
