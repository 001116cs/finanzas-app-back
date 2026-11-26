import type { ImagenBoleta } from '../boletas/application/lector-de-boletas.js';
import { ValidacionError } from './errores.js';

export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;

type TipoImagen = ImagenBoleta['mediaType'];

function empieza(bytes: Uint8Array, firma: number[], desde = 0): boolean {
  return (
    bytes.length >= desde + firma.length &&
    firma.every((b, i) => bytes[desde + i] === b)
  );
}

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/** Detecta el tipo por bytes mágicos (no confía en nombre ni Content-Type). */
export function detectarTipoImagen(bytes: Uint8Array): TipoImagen | null {
  if (empieza(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (empieza(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return 'image/png';
  if (empieza(bytes, ascii('RIFF')) && empieza(bytes, ascii('WEBP'), 8))
    return 'image/webp';
  return null;
}

/** Valida tamaño y tipo; devuelve la imagen lista para el lector. */
export function validarImagen(bytes: Uint8Array): ImagenBoleta {
  const invalida = (m: string) => new ValidacionError(m, 'IMAGEN_INVALIDA');
  if (bytes.length === 0) throw invalida('La imagen está vacía');
  if (bytes.length > MAX_BYTES_IMAGEN)
    throw invalida('La imagen supera los 5 MB');
  const mediaType = detectarTipoImagen(bytes);
  if (!mediaType) throw invalida('La imagen debe ser JPEG, PNG o WebP');
  return { bytes, mediaType };
}
