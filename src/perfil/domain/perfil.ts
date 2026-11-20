import { ValidacionError } from '../../compartido/errores.js';
import { esZonaHorariaValida } from '../../compartido/zona-horaria.js';

export interface Perfil {
  id: string;
  moneda: string;
  zonaHoraria: string;
}

export interface CategoriaSugerida {
  nombre: string;
  tipo: 'gasto' | 'ingreso';
}

export const CATEGORIAS_SUGERIDAS: readonly CategoriaSugerida[] = [
  ...[
    'Comida',
    'Transporte',
    'Hogar',
    'Salud',
    'Entretenimiento',
    'Servicios',
    'Otros',
  ].map((nombre) => ({ nombre, tipo: 'gasto' as const })),
  ...['Sueldo', 'Freelance', 'Otros'].map((nombre) => ({
    nombre,
    tipo: 'ingreso' as const,
  })),
];

const MONEDAS = new Set(Intl.supportedValuesOf('currency'));

export function validarMoneda(moneda: string): string {
  if (!MONEDAS.has(moneda))
    throw new ValidacionError('Moneda inválida (ISO 4217)');
  return moneda;
}

export function validarZonaHoraria(zona: string): string {
  if (!esZonaHorariaValida(zona))
    throw new ValidacionError('Zona horaria inválida (IANA)');
  return zona;
}
