import { ValidacionError } from '../../compartido/errores.js';
import { validarFecha } from '../../transacciones/domain/transaccion.js';

export interface ProductoLeido {
  descripcion: string;
  /** Con signo y 2 decimales, p. ej. "12.50" o "-3.00". */
  monto: string;
  categoriaId: string | null;
}

export interface LecturaBoleta {
  comercio: string;
  fecha: string | null;
  totalImpreso: string | null;
  productos: ProductoLeido[];
}

/** Lo que devuelve el modelo, sin normalizar. */
export interface LecturaCruda {
  esBoleta: boolean;
  comercio: string;
  fecha: string | null;
  totalImpreso: number | null;
  productos: { descripcion: string; monto: number; categoria: string | null }[];
}

const MAX_COMERCIO = 100;
const MAX_DESCRIPCION = 200;

function aMonto(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  const centavos = Math.round(n * 100);
  if (centavos === 0) return '0.00';
  const abs = Math.abs(centavos);
  const texto = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return centavos < 0 ? `-${texto}` : texto;
}

function fechaValida(fecha: string | null): string | null {
  if (!fecha) return null;
  try {
    return validarFecha(fecha.trim());
  } catch (e) {
    if (e instanceof ValidacionError) return null;
    throw e;
  }
}

export function normalizarLectura(
  cruda: LecturaCruda,
  categorias: { id: string; nombre: string }[],
): LecturaBoleta | null {
  if (!cruda.esBoleta) return null;

  const idPorNombre = new Map(
    categorias.map((c) => [c.nombre.trim().toLowerCase(), c.id]),
  );

  const productos: ProductoLeido[] = [];
  for (const p of cruda.productos) {
    const descripcion = p.descripcion.trim().slice(0, MAX_DESCRIPCION).trim();
    const monto = aMonto(p.monto);
    if (!descripcion || monto === null) continue;
    productos.push({
      descripcion,
      monto,
      categoriaId: p.categoria
        ? (idPorNombre.get(p.categoria.trim().toLowerCase()) ?? null)
        : null,
    });
  }
  if (productos.length === 0) return null;

  const total =
    cruda.totalImpreso !== null && cruda.totalImpreso > 0
      ? aMonto(cruda.totalImpreso)
      : null;

  return {
    comercio:
      cruda.comercio.trim().slice(0, MAX_COMERCIO).trim() ||
      'Comercio sin nombre',
    fecha: fechaValida(cruda.fecha),
    totalImpreso: total,
    productos,
  };
}
