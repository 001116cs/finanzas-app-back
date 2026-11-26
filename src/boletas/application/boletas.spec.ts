import { NoEncontradoError } from '../../compartido/errores.js';
import { EliminarBoleta } from './eliminar-boleta.js';
import { ObtenerBoleta } from './obtener-boleta.js';
import { ObtenerImagenBoleta } from './obtener-imagen-boleta.js';

const boleta = {
  id: 'b1',
  comercio: 'Super',
  fecha: '2026-03-01',
  totalImpreso: '10.00',
  rutaImagen: 'u/x.jpg',
  createdAt: new Date('2026-03-01T00:00:00Z'),
};

describe('ObtenerBoleta', () => {
  it('no expone rutaImagen', async () => {
    const repo = { obtener: vi.fn().mockResolvedValue(boleta) };
    const r = await new ObtenerBoleta(repo as never).ejecutar('u', 'b1');
    expect(r).toEqual({
      id: 'b1',
      comercio: 'Super',
      fecha: '2026-03-01',
      totalImpreso: '10.00',
      createdAt: boleta.createdAt,
    });
    expect(r).not.toHaveProperty('rutaImagen');
  });
  it('ajena: NoEncontradoError', async () => {
    const repo = { obtener: vi.fn().mockResolvedValue(null) };
    await expect(new ObtenerBoleta(repo as never).ejecutar('u', 'b1')).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('ObtenerImagenBoleta', () => {
  it('devuelve bytes y contentType', async () => {
    const repo = { obtener: vi.fn().mockResolvedValue(boleta) };
    const img = { bytes: new Uint8Array([1]), contentType: 'image/jpeg' };
    const almacen = { leer: vi.fn().mockResolvedValue(img) };
    expect(await new ObtenerImagenBoleta(repo as never, almacen as never).ejecutar('u', 'b1')).toEqual(img);
    expect(almacen.leer).toHaveBeenCalledWith('u/x.jpg');
  });
  it('boleta ajena: NoEncontradoError y no lee', async () => {
    const repo = { obtener: vi.fn().mockResolvedValue(null) };
    const almacen = { leer: vi.fn() };
    await expect(new ObtenerImagenBoleta(repo as never, almacen as never).ejecutar('u', 'b1')).rejects.toBeInstanceOf(NoEncontradoError);
    expect(almacen.leer).not.toHaveBeenCalled();
  });
  it('almacén null: NoEncontradoError', async () => {
    const repo = { obtener: vi.fn().mockResolvedValue(boleta) };
    const almacen = { leer: vi.fn().mockResolvedValue(null) };
    await expect(new ObtenerImagenBoleta(repo as never, almacen as never).ejecutar('u', 'b1')).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('EliminarBoleta', () => {
  it('elimina receipt e imagen', async () => {
    const repo = { eliminar: vi.fn().mockResolvedValue('u/x.jpg') };
    const almacen = { eliminar: vi.fn().mockResolvedValue(undefined) };
    await new EliminarBoleta(repo as never, almacen as never).ejecutar('u', 'b1');
    expect(almacen.eliminar).toHaveBeenCalledWith('u/x.jpg');
  });
  it('ajena: NoEncontradoError y almacén no llamado', async () => {
    const repo = { eliminar: vi.fn().mockResolvedValue(null) };
    const almacen = { eliminar: vi.fn() };
    await expect(new EliminarBoleta(repo as never, almacen as never).ejecutar('u', 'b1')).rejects.toBeInstanceOf(NoEncontradoError);
    expect(almacen.eliminar).not.toHaveBeenCalled();
  });
  it('almacén falla: no lanza', async () => {
    const repo = { eliminar: vi.fn().mockResolvedValue('u/x.jpg') };
    const almacen = { eliminar: vi.fn().mockRejectedValue(new Error('x')) };
    await expect(new EliminarBoleta(repo as never, almacen as never).ejecutar('u', 'b1')).resolves.toBeUndefined();
  });
});
