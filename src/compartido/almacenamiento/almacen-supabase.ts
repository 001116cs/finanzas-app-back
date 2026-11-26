import { AlmacenDeArchivos, validarRuta } from './almacen-de-archivos.js';

export interface OpcionesAlmacenSupabase {
  url: string;
  serviceKey: string;
  bucket: string;
  fetch?: typeof fetch;
}

/** Almacén sobre la API REST de Supabase Storage. */
export class AlmacenSupabase implements AlmacenDeArchivos {
  private readonly url: string;
  private readonly serviceKey: string;
  private readonly bucket: string;
  private readonly fetchFn: typeof fetch;

  constructor(opciones: OpcionesAlmacenSupabase) {
    this.url = opciones.url.replace(/\/+$/, '');
    this.serviceKey = opciones.serviceKey;
    this.bucket = opciones.bucket;
    this.fetchFn = opciones.fetch ?? globalThis.fetch;
  }

  private auth(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
    };
  }

  private fallo(operacion: string, estado: number): Error {
    // Nunca incluir la service key ni el cuerpo de la respuesta.
    return new Error(`Almacenamiento: ${operacion} falló con estado ${estado}`);
  }

  async guardar(
    ruta: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    validarRuta(ruta);
    const res = await this.fetchFn(
      `${this.url}/storage/v1/object/${this.bucket}/${ruta}`,
      {
        method: 'POST',
        headers: {
          ...this.auth(),
          'Content-Type': contentType,
          'x-upsert': 'false',
        },
        body: bytes as BodyInit,
      },
    );
    if (!res.ok) throw this.fallo('guardar', res.status);
  }

  async leer(
    ruta: string,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    validarRuta(ruta);
    const res = await this.fetchFn(
      `${this.url}/storage/v1/object/${this.bucket}/${ruta}`,
      { method: 'GET', headers: this.auth() },
    );
    if (res.status === 404) return null;
    if (res.status === 400) {
      // Supabase a veces responde 400 en lugar de 404 para objetos inexistentes.
      const cuerpo = await res.text().catch(() => '');
      if (/not.?found/i.test(cuerpo)) return null;
      throw this.fallo('leer', res.status);
    }
    if (!res.ok) throw this.fallo('leer', res.status);
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType:
        res.headers.get('content-type') ?? 'application/octet-stream',
    };
  }

  async eliminar(ruta: string): Promise<void> {
    validarRuta(ruta);
    const res = await this.fetchFn(
      `${this.url}/storage/v1/object/${this.bucket}`,
      {
        method: 'DELETE',
        headers: { ...this.auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [ruta] }),
      },
    );
    if (!res.ok) throw this.fallo('eliminar', res.status);
  }
}
