import { ValidacionError } from './errores.js';
import { detectarTipoImagen, MAX_BYTES_IMAGEN, validarImagen } from './imagen.js';

const bytes = (...n: number[]) => new Uint8Array(n);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0);
const WEBP = bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP'));

describe('detectarTipoImagen', () => {
  it('detecta JPEG, PNG y WebP', () => {
    expect(detectarTipoImagen(JPEG)).toBe('image/jpeg');
    expect(detectarTipoImagen(PNG)).toBe('image/png');
    expect(detectarTipoImagen(WEBP)).toBe('image/webp');
  });
  it('rechaza PDF, GIF, RIFF no WebP y vacío', () => {
    expect(detectarTipoImagen(bytes(...ascii('%PDF-1.4')))).toBeNull();
    expect(detectarTipoImagen(bytes(...ascii('GIF89a')))).toBeNull();
    expect(
      detectarTipoImagen(bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE'))),
    ).toBeNull();
    expect(detectarTipoImagen(new Uint8Array(0))).toBeNull();
  });
});

describe('validarImagen', () => {
  it('devuelve bytes y mediaType', () => {
    expect(validarImagen(PNG)).toEqual({ bytes: PNG, mediaType: 'image/png' });
  });
  it.each([
    ['vacía', new Uint8Array(0)],
    ['tipo no soportado', bytes(...ascii('GIF89a'))],
    [
      'mayor a 5 MB',
      (() => {
        const b = new Uint8Array(MAX_BYTES_IMAGEN + 1);
        b.set(JPEG);
        return b;
      })(),
    ],
  ])('rechaza imagen %s con IMAGEN_INVALIDA', (_n, b) => {
    try {
      validarImagen(b);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ValidacionError);
      expect((e as ValidacionError).codigo).toBe('IMAGEN_INVALIDA');
    }
  });
  it('acepta exactamente 5 MB', () => {
    const b = new Uint8Array(MAX_BYTES_IMAGEN);
    b.set(JPEG);
    expect(validarImagen(b).mediaType).toBe('image/jpeg');
  });
});
