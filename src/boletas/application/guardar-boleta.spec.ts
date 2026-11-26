import { ValidacionError, ValidacionFilaError } from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import { GuardarBoleta } from './guardar-boleta.js';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

const base = () => ({
  comercio: ' Super ',
  fecha: '2026-03-01',
  totalImpreso: '15.00' as string | null,
  productos: [
    { descripcion: 'Leche', monto: '10.50', categoriaId: 'c1' as string | null },
    { descripcion: 'Pan', monto: '4.50', categoriaId: null as string | null },
  ],
});

function montar() {
  const repo = { crearConGastos: vi.fn().mockResolvedValue({ id: 'b1', gastosCreados: 2 }) };
  const almacen = {
    guardar: vi.fn().mockResolvedValue(undefined),
    eliminar: vi.fn().mockResolvedValue(undefined),
    leer: vi.fn(),
  };
  const categorias = {
    obtener: vi.fn().mockResolvedValue({ id: 'c1', nombre: 'Comida', tipo: 'gasto' }),
  };
  const caso = new GuardarBoleta(repo as never, almacen as never, categorias as never);
  return { caso, repo, almacen, categorias };
}

async function error(p: Promise<unknown>): Promise<ValidacionError> {
  try {
    await p;
  } catch (e) {
    return e as ValidacionError;
  }
  throw new Error('no lanzó');
}

describe('GuardarBoleta', () => {
  it.each(['0', '-1'])('monto "%s" en un producto: error de fila y sin subida', async (monto) => {
    const t = montar();
    const d = base();
    d.productos[1].monto = monto;
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, d));
    expect(e).toBeInstanceOf(ValidacionFilaError);
    expect((e as ValidacionFilaError).fila).toBe(1);
    expect(e.codigo).toBe('MONTO_INVALIDO');
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('sin productos: PRODUCTOS_INVALIDOS', async () => {
    const t = montar();
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, { ...base(), productos: [] }));
    expect(e.codigo).toBe('PRODUCTOS_INVALIDOS');
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('más de 100 productos: PRODUCTOS_INVALIDOS', async () => {
    const t = montar();
    const productos = Array.from({ length: 101 }, () => ({ descripcion: 'x', monto: '1', categoriaId: null }));
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, { ...base(), productos }));
    expect(e.codigo).toBe('PRODUCTOS_INVALIDOS');
  });

  it('comercio vacío o > 100: COMERCIO_INVALIDO', async () => {
    const t = montar();
    for (const comercio of ['   ', 'x'.repeat(101)]) {
      const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, { ...base(), comercio }));
      expect(e.codigo).toBe('COMERCIO_INVALIDO');
    }
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('imagen inválida: IMAGEN_INVALIDA sin subida', async () => {
    const t = montar();
    const e = await error(t.caso.ejecutar('u', 'UTC', new Uint8Array(0), base()));
    expect(e.codigo).toBe('IMAGEN_INVALIDA');
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('categoría ajena: error de fila sin subida', async () => {
    const t = montar();
    t.categorias.obtener.mockResolvedValue(null);
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, base()));
    expect(e).toBeInstanceOf(ValidacionFilaError);
    expect((e as ValidacionFilaError).fila).toBe(0);
    expect(e.codigo).toBe('CATEGORIA_INCOMPATIBLE');
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('categoría de ingreso: error de fila sin subida', async () => {
    const t = montar();
    t.categorias.obtener.mockResolvedValue({ id: 'c1', nombre: 'Sueldo', tipo: 'ingreso' });
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, base()));
    expect(e).toBeInstanceOf(ValidacionFilaError);
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('cachea la consulta de categoría por id', async () => {
    const t = montar();
    const d = base();
    d.productos[1].categoriaId = 'c1';
    await t.caso.ejecutar('u', 'UTC', JPEG, d);
    expect(t.categorias.obtener).toHaveBeenCalledTimes(1);
  });

  it('fecha inválida: FECHA_INVALIDA', async () => {
    const t = montar();
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, { ...base(), fecha: '2026-02-30' }));
    expect(e.codigo).toBe('FECHA_INVALIDA');
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('total impreso inválido: error sin subida', async () => {
    const t = montar();
    const e = await error(t.caso.ejecutar('u', 'UTC', JPEG, { ...base(), totalImpreso: 'abc' }));
    expect(e).toBeInstanceOf(ValidacionError);
    expect(t.almacen.guardar).not.toHaveBeenCalled();
  });

  it('éxito: sube con ruta <userId>/<uuid>.jpg y crea con Monto correctos', async () => {
    const t = montar();
    const r = await t.caso.ejecutar('u1', 'UTC', JPEG, base());
    expect(r).toEqual({ id: 'b1', gastosCreados: 2 });
    const [ruta, bytes, tipo] = t.almacen.guardar.mock.calls[0];
    expect(ruta).toMatch(/^u1\/[0-9a-f-]{36}\.jpg$/);
    expect(bytes).toBe(JPEG);
    expect(tipo).toBe('image/jpeg');
    expect(t.repo.crearConGastos).toHaveBeenCalledWith('u1', {
      rutaImagen: ruta,
      comercio: 'Super',
      fecha: '2026-03-01',
      totalImpreso: Monto.desdeTexto('15.00'),
      gastos: [
        { descripcion: 'Leche', monto: Monto.desdeTexto('10.50'), categoriaId: 'c1' },
        { descripcion: 'Pan', monto: Monto.desdeTexto('4.50'), categoriaId: null },
      ],
    });
  });

  it('PNG usa extensión png y total null', async () => {
    const t = montar();
    await t.caso.ejecutar('u1', 'UTC', PNG, { ...base(), totalImpreso: null });
    expect(t.almacen.guardar.mock.calls[0][0]).toMatch(/\.png$/);
    expect(t.repo.crearConGastos.mock.calls[0][1].totalImpreso).toBeNull();
  });

  it('repo falla: elimina la imagen subida y relanza el error original', async () => {
    const t = montar();
    const boom = new Error('bd caída');
    t.repo.crearConGastos.mockRejectedValue(boom);
    await expect(t.caso.ejecutar('u1', 'UTC', JPEG, base())).rejects.toBe(boom);
    expect(t.almacen.eliminar).toHaveBeenCalledWith(t.almacen.guardar.mock.calls[0][0]);
  });

  it('repo falla y la limpieza también: relanza el error original', async () => {
    const t = montar();
    const boom = new Error('bd caída');
    t.repo.crearConGastos.mockRejectedValue(boom);
    t.almacen.eliminar.mockRejectedValue(new Error('storage caído'));
    await expect(t.caso.ejecutar('u1', 'UTC', JPEG, base())).rejects.toBe(boom);
  });
});
