import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../../config/env.js';
import type { LectorDeBoletas } from '../application/lector-de-boletas.js';
import { LectorClaude } from './lector-claude.js';
import { LectorFalso } from './lector-falso.js';

export function crearLectorDeBoletas(env: Env): LectorDeBoletas {
  if (env.AI_PROVIDER === 'claude') {
    return new LectorClaude(
      new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
      env.AI_MODEL_RECEIPTS,
    );
  }
  return new LectorFalso();
}
