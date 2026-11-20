export interface VerificadorDeToken {
  /** Lanza NoAutenticadoError si el token no es válido. */
  verificar(token: string): Promise<{ userId: string }>;
}

export const VERIFICADOR_DE_TOKEN = Symbol('VERIFICADOR_DE_TOKEN');
