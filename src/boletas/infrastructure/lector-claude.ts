import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { IaNoDisponibleError } from '../../compartido/errores.js';
import {
  esModeloConPrecio,
  type UsoTokens,
} from '../../uso-ia/domain/precios.js';
import type {
  ImagenBoleta,
  LectorDeBoletas,
  ResultadoLectura,
} from '../application/lector-de-boletas.js';

const Esquema = z.object({
  esBoleta: z.boolean(),
  comercio: z.string(),
  fecha: z.string().nullable(),
  totalImpreso: z.number().nullable(),
  productos: z.array(
    z.object({
      descripcion: z.string(),
      monto: z.number(),
      categoria: z.string().nullable(),
    }),
  ),
});

// Esquema JSON para output_config.format (sin la función `parse` del helper).
// Se usa `create` y no `parse`: `parse` interpreta el JSON dentro de la promesa
// y lanzaría AnthropicError perdiendo `usage` ante JSON truncado o inválido.
const FORMATO_SALIDA = {
  type: 'json_schema' as const,
  schema: zodOutputFormat(Esquema).schema,
};

const SYSTEM = `Eres un lector de boletas y recibos de compra. Recibirás la imagen de una boleta y una lista de categorías de gasto.

Reglas:
- Devuelve los datos tal como aparecen en la boleta, sin inventar nada.
- "comercio": el nombre del comercio.
- "productos": una entrada por línea de producto, con su descripción y su monto. Los montos son números positivos con los descuentos ya aplicados al producto al que corresponden. Si un descuento no se puede asignar a un producto concreto, réstalo del producto más caro, de forma que ninguna línea quede con monto negativo.
- "fecha": la fecha de la compra en formato YYYY-MM-DD, o null si no se lee con claridad.
- "totalImpreso": el total final impreso en la boleta, o null si no se lee.
- "categoria": uno de los nombres de la lista de categorías proporcionada, escrito exactamente igual, o null si ninguno encaja. Nunca inventes categorías.
- Si la imagen no es una boleta o no se puede leer, devuelve "esBoleta": false, "comercio" vacío, "fecha" y "totalImpreso" null y "productos" vacío.`;

const MODELO_FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const MODELO_PRECIO_MAXIMO = 'claude-opus-5-5';

export class LectorClaude implements LectorDeBoletas {
  private readonly logger = new Logger(LectorClaude.name);

  constructor(
    private readonly cliente: Anthropic,
    private readonly modelo: string,
  ) {}

  async leer(
    imagen: ImagenBoleta,
    categorias: string[],
  ): Promise<ResultadoLectura> {
    const lista =
      categorias.length > 0 ? categorias.join('\n') : '(sin categorías)';
    let r;
    try {
      r = await this.cliente.beta.messages.create({
        model: this.modelo,
        max_tokens: 16000,
        betas: [MODELO_FALLBACK_BETA],
        fallbacks: 'default',
        output_config: { effort: 'low', format: FORMATO_SALIDA },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imagen.mediaType,
                  data: Buffer.from(imagen.bytes).toString('base64'),
                },
              },
              {
                type: 'text',
                text: `Categorías de gasto disponibles:\n${lista}\n\nLee la boleta de la imagen.`,
              },
            ],
          },
        ],
      });
    } catch (e) {
      if (
        e instanceof Anthropic.APIError ||
        e instanceof Anthropic.APIConnectionError
      ) {
        this.logger.error(
          `Fallo al llamar a la IA: ${e.name} (status ${String(e.status)})`,
        );
        throw new IaNoDisponibleError();
      }
      throw e;
    }

    // Con fallbacks del servidor, r.model es el modelo que respondió. Si no
    // tiene precio conocido, se cobra al precio más alto de la tabla para no
    // subestimar el tope global.
    const modeloCobrado = esModeloConPrecio(r.model)
      ? r.model
      : MODELO_PRECIO_MAXIMO;
    const uso: UsoTokens = {
      modelo: modeloCobrado,
      inputTokens: r.usage.input_tokens,
      outputTokens: r.usage.output_tokens,
      cacheCreationTokens: r.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: r.usage.cache_read_input_tokens ?? 0,
    };

    if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') {
      return { tipo: 'ilegible', uso };
    }
    // Nunca se registra el texto del modelo en el log.
    const texto = r.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('');
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      return { tipo: 'ilegible', uso };
    }
    const parsed = Esquema.safeParse(json);
    if (!parsed.success || !parsed.data.esBoleta) {
      return { tipo: 'ilegible', uso };
    }
    return { tipo: 'ok', cruda: parsed.data, uso };
  }
}
