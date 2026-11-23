import { ValidacionFilaError } from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import {
  claveDuplicado,
  prepararFila,
  type FilaEntrada,
} from './fila-importada.js';

const HOY = '2026-11-22';
const base: FilaEntrada = {
  fecha: '2026-11-01',
  descripcion: 'Almuerzo',
  monto: '10.00',
  tipo: 'gasto',
  categoriaId: null,
  categoriaNueva: null,
};

function falla(fila: FilaEntrada, indice: number): ValidacionFilaError {
  try {
    prepararFila(fila, indice, HOY);
  } catch (e) {
    expect(e).toBeInstanceOf(ValidacionFilaError);
    return e as ValidacionFilaError;
  }
  throw new Error('no falló');
}

describe('prepararFila', () => {
  it('usa hoy cuando la fecha es null', () => {
    expect(prepararFila({ ...base, fecha: null }, 0, HOY).fecha).toBe(HOY);
  });

  it('conserva la fecha válida y recorta la descripción', () => {
    const f = prepararFila({ ...base, descripcion: '  Café ' }, 0, HOY);
    expect(f.fecha).toBe('2026-11-01');
    expect(f.descripcion).toBe('Café');
  });

  it('convierte "12.5" a 1250 centavos', () => {
    expect(prepararFila({ ...base, monto: '12.5' }, 0, HOY).monto.centavos).toBe(
      1250,
    );
  });

  it('monto "0" lanza ValidacionFilaError con fila y MONTO_INVALIDO', () => {
    const e = falla({ ...base, monto: '0' }, 4);
    expect(e.fila).toBe(4);
    expect(e.codigo).toBe('MONTO_INVALIDO');
    expect(e.message.startsWith('Fila 5: ')).toBe(true);
  });

  it('descripción vacía informa la fila', () => {
    const e = falla({ ...base, descripcion: '   ' }, 7);
    expect(e.fila).toBe(7);
    expect(e.codigo).toBe('VALIDACION');
  });

  it('fecha inválida informa la fila', () => {
    const e = falla({ ...base, fecha: '2026-02-30' }, 2);
    expect(e.fila).toBe(2);
    expect(e.codigo).toBe('FECHA_INVALIDA');
  });

  it('categoriaId y categoriaNueva a la vez ⇒ CATEGORIA_NUEVA_INVALIDA', () => {
    const e = falla({ ...base, categoriaId: 'x', categoriaNueva: 'Y' }, 3);
    expect(e.fila).toBe(3);
    expect(e.codigo).toBe('CATEGORIA_NUEVA_INVALIDA');
  });
});

describe('claveDuplicado', () => {
  it('ignora mayúsculas y espacios extremos de la descripción', () => {
    const a = claveDuplicado({
      fecha: '2026-11-01',
      monto: Monto.desdeTexto('10.00'),
      tipo: 'gasto',
      descripcion: '  CAFÉ ',
    });
    const b = claveDuplicado({
      fecha: '2026-11-01',
      monto: Monto.desdeTexto('10'),
      tipo: 'gasto',
      descripcion: 'café',
    });
    expect(a).toBe(b);
    expect(a).toBe('2026-11-01|1000|gasto|café');
  });
});
