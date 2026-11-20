import { ValidacionError } from './errores.js';

const FORMATO = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

/** Importe en centavos enteros; nunca usa floats. */
export class Monto {
  private constructor(readonly centavos: number) {}

  /** Sólo `^\d{1,10}(\.\d{1,2})?$` con valor > 0. */
  static desdeTexto(s: string): Monto {
    const m = typeof s === 'string' ? FORMATO.exec(s) : null;
    if (!m) throw montoInvalido();
    const centavos = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
    if (centavos <= 0) throw montoInvalido();
    return new Monto(centavos);
  }

  /** Para sumas y balances: admite cero y negativos. */
  static desdeCentavos(n: number): Monto {
    if (!Number.isSafeInteger(n))
      throw new ValidacionError('Centavos inválidos', 'MONTO_INVALIDO');
    return new Monto(n);
  }

  aTexto(): string {
    const abs = Math.abs(this.centavos);
    const signo = this.centavos < 0 ? '-' : '';
    return `${signo}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  }

  sumar(otro: Monto): Monto {
    return Monto.desdeCentavos(this.centavos + otro.centavos);
  }
}

function montoInvalido() {
  return new ValidacionError(
    'El monto debe ser un número positivo con hasta 2 decimales (ej. 12.50)',
    'MONTO_INVALIDO',
  );
}
