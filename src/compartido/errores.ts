export class NoAutenticadoError extends Error {
  readonly codigo = 'NO_AUTENTICADO';
  constructor(mensaje = 'No autenticado') {
    super(mensaje);
  }
}

export class ServicioNoDisponibleError extends Error {
  readonly codigo = 'AUTH_NO_DISPONIBLE';
  constructor(mensaje = 'Servicio de autenticación no disponible') {
    super(mensaje);
  }
}

export class NoEncontradoError extends Error {
  readonly codigo = 'NO_ENCONTRADO';
  constructor(mensaje = 'Recurso no encontrado') {
    super(mensaje);
  }
}

export class ValidacionError extends Error {
  constructor(
    mensaje: string,
    readonly codigo: string = 'VALIDACION',
  ) {
    super(mensaje);
  }
}

/** Error de validación de una fila de un lote; `fila` es el índice 0-based. */
export class ValidacionFilaError extends ValidacionError {
  constructor(
    readonly fila: number,
    original: ValidacionError,
  ) {
    super(`Fila ${fila + 1}: ${original.message}`, original.codigo);
  }
}

export class ConflictoError extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string = codigo,
  ) {
    super(mensaje);
  }
}

export class PerfilRequeridoError extends ConflictoError {
  constructor() {
    super('PERFIL_REQUERIDO', 'Debes completar tu perfil');
  }
}
