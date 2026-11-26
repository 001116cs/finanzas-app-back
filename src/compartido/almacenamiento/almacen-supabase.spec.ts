import { describe, expect, it } from 'vitest';
import { AlmacenSupabase } from './almacen-supabase.js';

type Llamada = { url: string; init: RequestInit };

function crear(respuesta: Response, url = 'https://x.supabase.co') {
  const llamadas: Llamada[] = [];
  const fetchFalso = (async (u: string, init?: RequestInit) => {
    llamadas.push({ url: u, init: init ?? {} });
    return respuesta;
  }) as typeof fetch;
  const almacen = new AlmacenSupabase({
    url,
    serviceKey: 'CLAVE-SECRETA',
    bucket: 'boletas',
    fetch: fetchFalso,
  });
  return { almacen, llamadas };
}

describe('AlmacenSupabase', () => {
  it('guardar hace POST con headers y body correctos', async () => {
    const { almacen, llamadas } = crear(new Response('{}', { status: 200 }));
    const bytes = new Uint8Array([1, 2, 3]);
    await almacen.guardar('u/b.png', bytes, 'image/png');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].url).toBe(
      'https://x.supabase.co/storage/v1/object/boletas/u/b.png',
    );
    expect(llamadas[0].init.method).toBe('POST');
    expect(llamadas[0].init.headers).toEqual({
      Authorization: 'Bearer CLAVE-SECRETA',
      apikey: 'CLAVE-SECRETA',
      'Content-Type': 'image/png',
      'x-upsert': 'false',
    });
    expect(llamadas[0].init.body).toBe(bytes);
  });

  it('leer hace GET y devuelve bytes y content-type', async () => {
    const { almacen, llamadas } = crear(
      new Response(new Uint8Array([9, 8]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    const r = await almacen.leer('u/b.jpg');
    expect(llamadas[0].url).toBe(
      'https://x.supabase.co/storage/v1/object/boletas/u/b.jpg',
    );
    expect(llamadas[0].init.method).toBe('GET');
    expect(llamadas[0].init.headers).toEqual({
      Authorization: 'Bearer CLAVE-SECRETA',
      apikey: 'CLAVE-SECRETA',
    });
    expect(Array.from(r!.bytes)).toEqual([9, 8]);
    expect(r!.contentType).toBe('image/jpeg');
  });

  it('leer con 404 devuelve null', async () => {
    const { almacen } = crear(new Response('nope', { status: 404 }));
    expect(await almacen.leer('x.png')).toBeNull();
  });

  it('leer con 400 "not found" devuelve null', async () => {
    const { almacen } = crear(
      new Response('{"error":"Object not found"}', { status: 400 }),
    );
    expect(await almacen.leer('x.png')).toBeNull();
  });

  it('eliminar hace DELETE con prefixes JSON', async () => {
    const { almacen, llamadas } = crear(new Response('[]', { status: 200 }));
    await almacen.eliminar('u/b.png');
    expect(llamadas[0].url).toBe(
      'https://x.supabase.co/storage/v1/object/boletas',
    );
    expect(llamadas[0].init.method).toBe('DELETE');
    expect(llamadas[0].init.headers).toEqual({
      Authorization: 'Bearer CLAVE-SECRETA',
      apikey: 'CLAVE-SECRETA',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(llamadas[0].init.body as string)).toEqual({
      prefixes: ['u/b.png'],
    });
  });

  it('guardar con 500 lanza un error sin la key ni el cuerpo', async () => {
    const { almacen } = crear(
      new Response('detalle CLAVE-SECRETA', { status: 500 }),
    );
    const error = await almacen
      .guardar('a.png', new Uint8Array([1]), 'image/png')
      .catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      'Almacenamiento: guardar falló con estado 500',
    );
    expect((error as Error).message).not.toContain('CLAVE-SECRETA');
  });

  it('normaliza la barra final de la url', async () => {
    const { almacen, llamadas } = crear(
      new Response('{}', { status: 200 }),
      'https://x.supabase.co/',
    );
    await almacen.guardar('a.png', new Uint8Array([1]), 'image/png');
    expect(llamadas[0].url).toBe(
      'https://x.supabase.co/storage/v1/object/boletas/a.png',
    );
  });

  it('valida la ruta', async () => {
    const { almacen, llamadas } = crear(new Response('{}'));
    await expect(almacen.leer('../x')).rejects.toThrow();
    expect(llamadas).toHaveLength(0);
  });
});
