import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AlmacenDeArchivos, validarRuta } from './almacen-de-archivos.js';

/** Almacén local en disco: `<raiz>/<ruta>` + `<ruta>.meta.json` con el contentType. */
export class AlmacenEnDisco implements AlmacenDeArchivos {
  constructor(private readonly raiz: string) {}

  private rutaFisica(ruta: string): string {
    validarRuta(ruta);
    return path.join(this.raiz, ruta);
  }

  async guardar(
    ruta: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    const destino = this.rutaFisica(ruta);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, bytes);
    await fs.writeFile(`${destino}.meta.json`, JSON.stringify({ contentType }));
  }

  async leer(
    ruta: string,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    const origen = this.rutaFisica(ruta);
    try {
      const bytes = new Uint8Array(await fs.readFile(origen));
      const meta = JSON.parse(
        await fs.readFile(`${origen}.meta.json`, 'utf8'),
      ) as { contentType: string };
      return { bytes, contentType: meta.contentType };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  async eliminar(ruta: string): Promise<void> {
    const destino = this.rutaFisica(ruta);
    await fs.rm(destino, { force: true });
    await fs.rm(`${destino}.meta.json`, { force: true });
  }
}
