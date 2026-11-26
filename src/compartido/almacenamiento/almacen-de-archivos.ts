/** Puerto de almacenamiento de archivos (boletas, etc.). */
export interface AlmacenDeArchivos {
  guardar(ruta: string, bytes: Uint8Array, contentType: string): Promise<void>;
  leer(
    ruta: string,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  eliminar(ruta: string): Promise<void>;
}

export const ALMACEN_DE_ARCHIVOS = Symbol('ALMACEN_DE_ARCHIVOS');

const RUTA_VALIDA = /^[A-Za-z0-9/_.-]+$/;

/** Rechaza rutas vacías, absolutas, con `..`, con `\` o con caracteres no permitidos. */
export function validarRuta(ruta: string): void {
  if (
    typeof ruta !== 'string' ||
    ruta === '' ||
    ruta.startsWith('/') ||
    ruta.includes('\\') ||
    ruta.split('/').includes('..') ||
    !RUTA_VALIDA.test(ruta)
  ) {
    throw new Error('Ruta de almacenamiento inválida');
  }
}
