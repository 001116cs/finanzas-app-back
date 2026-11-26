import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlmacenEnDisco } from './almacen-en-disco.js';

describe('AlmacenEnDisco', () => {
  let raiz: string;
  let almacen: AlmacenEnDisco;

  beforeEach(async () => {
    raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'almacen-'));
    almacen = new AlmacenEnDisco(raiz);
  });

  afterEach(async () => {
    await fs.rm(raiz, { recursive: true, force: true });
  });

  it('guarda y lee los mismos bytes y contentType', async () => {
    const bytes = new Uint8Array([1, 2, 3, 255]);
    await almacen.guardar('u1/b/foto.png', bytes, 'image/png');
    const leido = await almacen.leer('u1/b/foto.png');
    expect(leido).not.toBeNull();
    expect(Array.from(leido!.bytes)).toEqual([1, 2, 3, 255]);
    expect(leido!.contentType).toBe('image/png');
  });

  it('leer de algo inexistente devuelve null', async () => {
    expect(await almacen.leer('no/existe.png')).toBeNull();
  });

  it('eliminar y luego leer devuelve null', async () => {
    await almacen.guardar('a.txt', new Uint8Array([1]), 'text/plain');
    await almacen.eliminar('a.txt');
    expect(await almacen.leer('a.txt')).toBeNull();
  });

  it('eliminar algo inexistente no lanza', async () => {
    await expect(almacen.eliminar('nada.txt')).resolves.toBeUndefined();
  });

  it.each(['../x', '/abs', 'a/../b', '', 'a\\b', 'a b'])(
    'rechaza la ruta inválida %j',
    async (ruta) => {
      await expect(
        almacen.guardar(ruta, new Uint8Array([1]), 'text/plain'),
      ).rejects.toThrow();
      await expect(almacen.leer(ruta)).rejects.toThrow();
      await expect(almacen.eliminar(ruta)).rejects.toThrow();
    },
  );
});
