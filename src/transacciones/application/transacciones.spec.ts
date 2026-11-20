import {
  NoEncontradoError,
  ValidacionError,
} from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { Categoria } from '../../categorias/domain/categoria.js';
import type { CategoriaRepository } from '../../categorias/application/categoria.repository.js';
import type { Transaccion } from '../domain/transaccion.js';
import type { TransaccionRepository } from './transaccion.repository.js';
import { CrearTransaccion } from './crear-transaccion.js';
import { EditarTransaccion } from './editar-transaccion.js';
import { EliminarTransaccion } from './eliminar-transaccion.js';
import { ListarTransacciones } from './listar-transacciones.js';

class CatsMemoria {
  filas: (Categoria & { userId: string })[] = [
    { id: 'cg', nombre: 'Comida', tipo: 'gasto', userId: 'u1' },
    { id: 'ci', nombre: 'Sueldo', tipo: 'ingreso', userId: 'u1' },
  ];
  async obtener(userId: string, id: string) {
    return this.filas.find((c) => c.userId === userId && c.id === id) ?? null;
  }
}

class RepoMemoria implements TransaccionRepository {
  filas: (Transaccion & { userId: string })[] = [];
  private n = 0;
  constructor(private readonly cats: CatsMemoria) {}
  private nombre(id: string | null) {
    return this.cats.filas.find((c) => c.id === id)?.nombre ?? null;
  }
  async crear(
    userId: string,
    d: {
      tipo: TipoMovimiento;
      monto: Monto;
      fecha: string;
      descripcion: string;
      categoriaId: string | null;
    },
  ) {
    const t = {
      id: `t${++this.n}`,
      ...d,
      categoriaNombre: this.nombre(d.categoriaId),
      origen: 'manual' as const,
      createdAt: new Date(),
      userId,
    };
    this.filas.push(t);
    return t;
  }
  async obtener(userId: string, id: string) {
    return this.filas.find((t) => t.userId === userId && t.id === id) ?? null;
  }
  async actualizar(userId: string, id: string, c: Partial<Transaccion>) {
    const t = this.filas.find((f) => f.userId === userId && f.id === id);
    if (!t) return null;
    Object.assign(t, c);
    t.categoriaNombre = this.nombre(t.categoriaId);
    return t;
  }
  async eliminar(userId: string, id: string) {
    const antes = this.filas.length;
    this.filas = this.filas.filter(
      (t) => !(t.userId === userId && t.id === id),
    );
    return this.filas.length < antes;
  }
  async listar() {
    return { items: this.filas, total: this.filas.length };
  }
  async totales() {
    return { porCategoria: [] };
  }
}

function armar() {
  const cats = new CatsMemoria();
  const repo = new RepoMemoria(cats);
  const catRepo = cats as unknown as CategoriaRepository;
  return {
    repo,
    crear: new CrearTransaccion(repo, catRepo),
    editar: new EditarTransaccion(repo, catRepo),
    eliminar: new EliminarTransaccion(repo),
    listar: new ListarTransacciones(repo),
  };
}
const base = {
  tipo: 'gasto' as const,
  monto: '12.5',
  fecha: '2026-03-01',
  descripcion: '  Almuerzo ',
  categoriaId: 'cg' as string | null,
};

describe('CrearTransaccion', () => {
  it('crea con monto convertido y descripción recortada', async () => {
    const { crear, repo } = armar();
    const t = await crear.ejecutar('u1', base);
    expect(t.monto.centavos).toBe(1250);
    expect(repo.filas[0].descripcion).toBe('Almuerzo');
    expect(t.categoriaNombre).toBe('Comida');
  });

  it('fechas imposibles -> ValidacionError', async () => {
    const { crear, repo } = armar();
    for (const fecha of ['2026-02-30', '2026-13-01', '2026-1-1', 'hoy'])
      await expect(
        crear.ejecutar('u1', { ...base, fecha }),
      ).rejects.toBeInstanceOf(ValidacionError);
    await crear.ejecutar('u1', { ...base, fecha: '2028-02-29' });
    expect(repo.filas).toHaveLength(1);
  });

  it('descripción vacía o de 201 caracteres -> ValidacionError; 200 es válida', async () => {
    const { crear } = armar();
    await expect(
      crear.ejecutar('u1', { ...base, descripcion: '   ' }),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      crear.ejecutar('u1', { ...base, descripcion: 'a'.repeat(201) }),
    ).rejects.toBeInstanceOf(ValidacionError);
    await crear.ejecutar('u1', { ...base, descripcion: 'a'.repeat(200) });
  });

  it('categoría incompatible, ajena o inexistente -> CATEGORIA_INCOMPATIBLE sin guardar', async () => {
    const { crear, repo } = armar();
    for (const [userId, categoriaId] of [
      ['u1', 'ci'],
      ['u2', 'cg'],
      ['u1', 'nope'],
    ]) {
      await expect(
        crear.ejecutar(userId, { ...base, categoriaId }),
      ).rejects.toMatchObject({
        codigo: 'CATEGORIA_INCOMPATIBLE',
      });
    }
    expect(repo.filas).toHaveLength(0);
  });

  it('categoriaId null es válido', async () => {
    const { crear } = armar();
    expect(
      (await crear.ejecutar('u1', { ...base, categoriaId: null }))
        .categoriaNombre,
    ).toBeNull();
  });
});

describe('EditarTransaccion', () => {
  it('cambiar tipo con la categoría actual incompatible -> CATEGORIA_INCOMPATIBLE', async () => {
    const { crear, editar, repo } = armar();
    const t = await crear.ejecutar('u1', base);
    await expect(
      editar.ejecutar('u1', t.id, { tipo: 'ingreso' }),
    ).rejects.toMatchObject({
      codigo: 'CATEGORIA_INCOMPATIBLE',
    });
    expect(repo.filas[0].tipo).toBe('gasto');
  });

  it('cambiar tipo y categoría a la vez funciona; categoriaId null la quita', async () => {
    const { crear, editar } = armar();
    const t = await crear.ejecutar('u1', base);
    const e = await editar.ejecutar('u1', t.id, {
      tipo: 'ingreso',
      categoriaId: 'ci',
    });
    expect(e.categoriaNombre).toBe('Sueldo');
    const s = await editar.ejecutar('u1', t.id, { categoriaId: null });
    expect(s.categoriaId).toBeNull();
  });

  it('edita monto/fecha/descripcion con validación; ajena -> NoEncontrado', async () => {
    const { crear, editar } = armar();
    const t = await crear.ejecutar('u1', base);
    const e = await editar.ejecutar('u1', t.id, {
      monto: '3',
      descripcion: ' X ',
    });
    expect(e.monto.aTexto()).toBe('3.00');
    expect(e.descripcion).toBe('X');
    await expect(
      editar.ejecutar('u1', t.id, { monto: '0' }),
    ).rejects.toMatchObject({ codigo: 'MONTO_INVALIDO' });
    await expect(
      editar.ejecutar('u1', t.id, { fecha: '2026-02-30' }),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      editar.ejecutar('u2', t.id, { monto: '1' }),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('EliminarTransaccion y ListarTransacciones', () => {
  it('elimina; ajena o inexistente -> NoEncontrado', async () => {
    const { crear, eliminar, repo } = armar();
    const t = await crear.ejecutar('u1', base);
    await expect(eliminar.ejecutar('u2', t.id)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    await eliminar.ejecutar('u1', t.id);
    expect(repo.filas).toHaveLength(0);
  });

  it('listar valida fechas del filtro', async () => {
    const { listar } = armar();
    await expect(
      listar.ejecutar('u1', { desde: '2026-02-30', pagina: 1, tamano: 50 }),
    ).rejects.toBeInstanceOf(ValidacionError);
    expect((await listar.ejecutar('u1', { pagina: 1, tamano: 50 })).total).toBe(
      0,
    );
  });
});
