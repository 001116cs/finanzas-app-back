import { ValidacionError } from './errores.js';
import { Monto } from './monto.js';

describe('Monto', () => {
  it('"12.5" -> "12.50" y 1250 centavos', () => {
    const m = Monto.desdeTexto('12.5');
    expect(m.aTexto()).toBe('12.50');
    expect(m.centavos).toBe(1250);
  });

  it('acepta enteros, 2 decimales y el máximo de 10 dígitos', () => {
    expect(Monto.desdeTexto('7').centavos).toBe(700);
    expect(Monto.desdeTexto('0.05').centavos).toBe(5);
    expect(Monto.desdeTexto('9999999999.99').aTexto()).toBe('9999999999.99');
  });

  it.each([
    '0',
    '0.00',
    '-5.00',
    '1,50',
    '12.345',
    'abc',
    '12345678901.00',
    '',
    ' 1',
    '1.',
  ])('%j -> MONTO_INVALIDO', (s) => {
    try {
      Monto.desdeTexto(s);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ValidacionError);
      expect((e as ValidacionError).codigo).toBe('MONTO_INVALIDO');
    }
  });

  it('desdeCentavos, sumar y negativos', () => {
    expect(Monto.desdeCentavos(5).aTexto()).toBe('0.05');
    expect(
      Monto.desdeCentavos(1250).sumar(Monto.desdeCentavos(50)).aTexto(),
    ).toBe('13.00');
    expect(Monto.desdeCentavos(-2000).aTexto()).toBe('-20.00');
  });
});
