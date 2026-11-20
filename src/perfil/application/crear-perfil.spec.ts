import { ValidacionError } from '../../compartido/errores.js';
import type { CategoriaSugerida, Perfil } from '../domain/perfil.js';
import { CrearPerfil } from './crear-perfil.js';
import type { PerfilRepository } from './perfil.repository.js';

class RepoMemoria implements PerfilRepository {
  perfiles = new Map<string, Perfil>();
  categorias: (CategoriaSugerida & { userId: string })[] = [];
  async obtener(id: string) {
    return this.perfiles.get(id) ?? null;
  }
  async crearConCategorias(p: Perfil, cats: readonly CategoriaSugerida[]) {
    this.perfiles.set(p.id, p);
    cats.forEach((c) => this.categorias.push({ ...c, userId: p.id }));
  }
  async actualizar(p: Perfil) {
    this.perfiles.set(p.id, p);
  }
}

describe('CrearPerfil', () => {
  const datos = { moneda: 'PEN', zonaHoraria: 'America/Lima' };
  let repo: RepoMemoria;
  let caso: CrearPerfil;
  beforeEach(() => {
    repo = new RepoMemoria();
    caso = new CrearPerfil(repo);
  });

  it('crea el perfil y las 10 categorías sugeridas con su tipo', async () => {
    const r = await caso.ejecutar('u1', datos);
    expect(r.creado).toBe(true);
    expect(r.perfil).toEqual({ id: 'u1', ...datos });
    expect(repo.categorias).toHaveLength(10);
    const gastos = repo.categorias.filter((c) => c.tipo === 'gasto');
    const ingresos = repo.categorias.filter((c) => c.tipo === 'ingreso');
    expect(gastos.map((c) => c.nombre)).toEqual([
      'Comida',
      'Transporte',
      'Hogar',
      'Salud',
      'Entretenimiento',
      'Servicios',
      'Otros',
    ]);
    expect(ingresos.map((c) => c.nombre)).toEqual([
      'Sueldo',
      'Freelance',
      'Otros',
    ]);
  });

  it('segunda llamada devuelve creado:false y no duplica', async () => {
    await caso.ejecutar('u1', datos);
    const r = await caso.ejecutar('u1', {
      moneda: 'USD',
      zonaHoraria: 'UTC',
    });
    expect(r.creado).toBe(false);
    expect(r.perfil.moneda).toBe('PEN');
    expect(repo.categorias).toHaveLength(10);
  });

  it('moneda inválida lanza ValidacionError', async () => {
    await expect(
      caso.ejecutar('u1', { ...datos, moneda: 'XXQ' }),
    ).rejects.toBeInstanceOf(ValidacionError);
    expect(repo.perfiles.size).toBe(0);
  });

  it('zona horaria inválida lanza ValidacionError', async () => {
    await expect(
      caso.ejecutar('u1', { ...datos, zonaHoraria: 'Mars/Base' }),
    ).rejects.toBeInstanceOf(ValidacionError);
  });
});
