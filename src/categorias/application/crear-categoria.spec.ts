import {
  ConflictoError,
  NoEncontradoError,
  ValidacionError,
} from '../../compartido/errores.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { Categoria, CategoriaConConteo } from '../domain/categoria.js';
import type { CategoriaRepository } from './categoria.repository.js';
import { CrearCategoria } from './crear-categoria.js';
import { ListarCategorias } from './listar-categorias.js';
import { RenombrarCategoria } from './renombrar-categoria.js';

class RepoMemoria implements CategoriaRepository {
  filas: (Categoria & { userId: string })[] = [];
  private n = 0;
  async listar(userId: string, tipo?: TipoMovimiento) {
    return this.filas
      .filter((c) => c.userId === userId && (!tipo || c.tipo === tipo))
      .map<CategoriaConConteo>((c) => ({ ...c, cantidadMovimientos: 0 }));
  }
  async obtener(userId: string, id: string) {
    return this.filas.find((c) => c.userId === userId && c.id === id) ?? null;
  }
  async crear(userId: string, d: { nombre: string; tipo: TipoMovimiento }) {
    if (this.dup(userId, d.tipo, d.nombre))
      throw new ConflictoError('CATEGORIA_DUPLICADA');
    const c = { id: `c${++this.n}`, ...d, userId };
    this.filas.push(c);
    return { id: c.id, nombre: c.nombre, tipo: c.tipo };
  }
  async renombrar(userId: string, id: string, nombre: string) {
    const c = this.filas.find((f) => f.userId === userId && f.id === id)!;
    if (this.dup(userId, c.tipo, nombre))
      throw new ConflictoError('CATEGORIA_DUPLICADA');
    c.nombre = nombre;
    return { id: c.id, nombre: c.nombre, tipo: c.tipo };
  }
  async contarMovimientos() {
    return 0;
  }
  private dup(userId: string, tipo: string, nombre: string) {
    return this.filas.some(
      (c) =>
        c.userId === userId &&
        c.tipo === tipo &&
        c.nombre.toLowerCase() === nombre.toLowerCase(),
    );
  }
}

describe('CrearCategoria', () => {
  let repo: RepoMemoria;
  let caso: CrearCategoria;
  beforeEach(() => {
    repo = new RepoMemoria();
    caso = new CrearCategoria(repo);
  });

  it('guarda el nombre sin espacios a los lados', async () => {
    const c = await caso.ejecutar('u1', {
      nombre: '  Mascotas  ',
      tipo: 'gasto',
    });
    expect(c.nombre).toBe('Mascotas');
    expect(repo.filas[0].nombre).toBe('Mascotas');
  });

  it('nombre vacío o sólo espacios -> ValidacionError', async () => {
    await expect(
      caso.ejecutar('u1', { nombre: '', tipo: 'gasto' }),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      caso.ejecutar('u1', { nombre: '   ', tipo: 'gasto' }),
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it('nombre de 51 caracteres -> ValidacionError; 50 es válido', async () => {
    await expect(
      caso.ejecutar('u1', { nombre: 'a'.repeat(51), tipo: 'gasto' }),
    ).rejects.toBeInstanceOf(ValidacionError);
    await caso.ejecutar('u1', { nombre: 'a'.repeat(50), tipo: 'gasto' });
    expect(repo.filas).toHaveLength(1);
  });

  it('duplicado ignorando mayúsculas -> ConflictoError', async () => {
    await caso.ejecutar('u1', { nombre: 'Comida', tipo: 'gasto' });
    await expect(
      caso.ejecutar('u1', { nombre: 'comida', tipo: 'gasto' }),
    ).rejects.toBeInstanceOf(ConflictoError);
    await caso.ejecutar('u1', { nombre: 'comida', tipo: 'ingreso' });
  });
});

describe('RenombrarCategoria', () => {
  it('recorta el nombre, valida y responde NoEncontrado si no es del usuario', async () => {
    const repo = new RepoMemoria();
    const c = await new CrearCategoria(repo).ejecutar('u1', {
      nombre: 'Uno',
      tipo: 'gasto',
    });
    const caso = new RenombrarCategoria(repo);
    expect((await caso.ejecutar('u1', c.id, '  Dos ')).nombre).toBe('Dos');
    await expect(caso.ejecutar('u1', c.id, '')).rejects.toBeInstanceOf(
      ValidacionError,
    );
    await expect(caso.ejecutar('u2', c.id, 'X')).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    expect(repo.filas[0].nombre).toBe('Dos');
  });
});

describe('ListarCategorias', () => {
  it('delega en el repositorio con el tipo', async () => {
    const repo = new RepoMemoria();
    const crear = new CrearCategoria(repo);
    await crear.ejecutar('u1', { nombre: 'A', tipo: 'gasto' });
    await crear.ejecutar('u1', { nombre: 'B', tipo: 'ingreso' });
    const r = await new ListarCategorias(repo).ejecutar('u1', 'ingreso');
    expect(r.map((c) => c.nombre)).toEqual(['B']);
  });
});
