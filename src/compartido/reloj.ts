export interface Reloj {
  ahora(): Date;
}

export const RELOJ = Symbol('RELOJ');

export const relojDelSistema: Reloj = { ahora: () => new Date() };
