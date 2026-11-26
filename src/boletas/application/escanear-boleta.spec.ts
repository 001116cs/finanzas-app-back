import { ConflictoError, IaNoDisponibleError, BoletaIlegibleError, ValidacionError } from '../../compartido/errores.js';
import type { LecturaCruda } from '../domain/lectura.js';
import { EscanearBoleta } from './escanear-boleta.js';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const uso = { entrada: 10, salida: 5 } as never;
const cruda: LecturaCruda = {
  esBoleta: true,
  comercio: 'Super',
  fecha: '2026-03-01',
  totalImpreso: 12.5,
  productos: [{ descripcion: 'Leche', monto: 12.5, categoria: 'Comida' }],
};

function montar() {
  const verificarCupo = {
    ejecutar: vi.fn().mockResolvedValue({ mes: '2026-03' }),
  };
  const registrar = {
    exito: vi.fn().mockResolvedValue(undefined),
    fallo: vi.fn().mockResolvedValue(undefined),
    cancelar: vi.fn().mockResolvedValue(undefined),
  };
  const categorias = {
    listar: vi.fn().mockResolvedValue([{ id: 'c1', nombre: 'Comida', tipo: 'gasto', cantidadMovimientos: 0 }]),
  };
  const lector = { leer: vi.fn().mockResolvedValue({ tipo: 'ok', cruda, uso }) };
  const caso = new EscanearBoleta(
    lector as never,
    verificarCupo as never,
    registrar as never,
    categorias as never,
  );
  return { caso, verificarCupo, registrar, categorias, lector };
}

describe('EscanearBoleta', () => {
  it('imagen inválida: no consume cupo ni llama al lector', async () => {
    const t = montar();
    await expect(t.caso.ejecutar('u', 'UTC', new Uint8Array(0))).rejects.toBeInstanceOf(ValidacionError);
    expect(t.verificarCupo.ejecutar).not.toHaveBeenCalled();
    expect(t.lector.leer).not.toHaveBeenCalled();
  });

  it('sin cupo: propaga ConflictoError y no llama al lector', async () => {
    const t = montar();
    t.verificarCupo.ejecutar.mockRejectedValue(new ConflictoError('LIMITE_BOLETAS'));
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBeInstanceOf(ConflictoError);
    expect(t.lector.leer).not.toHaveBeenCalled();
  });

  it('ok: registra éxito y devuelve la lectura con categoriaId', async () => {
    const t = montar();
    const r = await t.caso.ejecutar('u', 'UTC', JPEG);
    expect(t.categorias.listar).toHaveBeenCalledWith('u', 'gasto');
    expect(t.lector.leer).toHaveBeenCalledWith({ bytes: JPEG, mediaType: 'image/jpeg' }, ['Comida']);
    expect(t.registrar.exito).toHaveBeenCalledWith('2026-03', uso);
    expect(t.registrar.fallo).not.toHaveBeenCalled();
    expect(r.productos[0].categoriaId).toBe('c1');
    expect(r.comercio).toBe('Super');
  });

  it('ilegible: registra fallo y lanza BoletaIlegibleError', async () => {
    const t = montar();
    t.lector.leer.mockResolvedValue({ tipo: 'ilegible', uso });
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBeInstanceOf(BoletaIlegibleError);
    expect(t.registrar.fallo).toHaveBeenCalledWith('u', '2026-03', uso);
    expect(t.registrar.exito).not.toHaveBeenCalled();
  });

  it('ok pero normalización null: fallo + BoletaIlegibleError', async () => {
    const t = montar();
    t.lector.leer.mockResolvedValue({ tipo: 'ok', cruda: { ...cruda, esBoleta: false }, uso });
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBeInstanceOf(BoletaIlegibleError);
    expect(t.registrar.fallo).toHaveBeenCalledWith('u', '2026-03', uso);
    expect(t.registrar.exito).not.toHaveBeenCalled();
  });

  it('IaNoDisponibleError: cancela la reserva, sin exito ni fallo', async () => {
    const t = montar();
    t.lector.leer.mockRejectedValue(new IaNoDisponibleError());
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBeInstanceOf(IaNoDisponibleError);
    expect(t.registrar.cancelar).toHaveBeenCalledWith('u', '2026-03');
    expect(t.registrar.exito).not.toHaveBeenCalled();
    expect(t.registrar.fallo).not.toHaveBeenCalled();
  });

  it('error inesperado del lector: cancela y relanza', async () => {
    const t = montar();
    const e = new TypeError('boom');
    t.lector.leer.mockRejectedValue(e);
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBe(e);
    expect(t.registrar.cancelar).toHaveBeenCalledWith('u', '2026-03');
    expect(t.registrar.exito).not.toHaveBeenCalled();
  });

  it('si cancelar falla, igual relanza el error original', async () => {
    const t = montar();
    t.registrar.cancelar.mockRejectedValue(new Error('bd'));
    t.lector.leer.mockRejectedValue(new IaNoDisponibleError());
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBeInstanceOf(IaNoDisponibleError);
  });

  it('si la categoría falla tras reservar, cancela la reserva', async () => {
    const t = montar();
    t.categorias.listar.mockRejectedValue(new Error('bd'));
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toThrow('bd');
    expect(t.registrar.cancelar).toHaveBeenCalledWith('u', '2026-03');
    expect(t.lector.leer).not.toHaveBeenCalled();
  });

  it('exito que lanza: igual devuelve la lectura', async () => {
    const t = montar();
    t.registrar.exito.mockRejectedValue(new Error('bd'));
    const r = await t.caso.ejecutar('u', 'UTC', JPEG);
    expect(r.comercio).toBe('Super');
    expect(t.registrar.cancelar).not.toHaveBeenCalled();
  });

  it('fallo que lanza: igual lanza BoletaIlegibleError', async () => {
    const t = montar();
    t.lector.leer.mockResolvedValue({ tipo: 'ilegible', uso });
    t.registrar.fallo.mockRejectedValue(new Error('bd'));
    await expect(t.caso.ejecutar('u', 'UTC', JPEG)).rejects.toBeInstanceOf(BoletaIlegibleError);
  });
});
