export interface UsoMensual {
  boletasUsadas: number;
  preguntasUsadas: number;
  intentosFallidos: number;
}

export interface UsoIaRepository {
  /** Uso del usuario en el mes; ceros si no hay fila. */
  obtener(userId: string, mes: string): Promise<UsoMensual>;
  /** Costo global estimado (USD) del mes; 0 si no hay fila. */
  costoGlobal(mes: string): Promise<number>;
  /**
   * Reserva atómica (una sola sentencia) de una boleta: crea la fila con 1 o
   * suma 1 sólo si boletasUsadas < limiteBoletas e intentosFallidos <
   * limiteFallidos. true si reservó. Con un límite en 0 nunca reserva.
   */
  reservarBoleta(
    userId: string,
    mes: string,
    limiteBoletas: number,
    limiteFallidos: number,
  ): Promise<boolean>;
  /** La boleta reservada se procesó: sólo suma el costo global. */
  confirmarBoleta(mesGlobal: string, costoUsd: number): Promise<void>;
  /** Transacción: -1 boleta (mínimo 0), +1 intento fallido y +costo global. */
  liberarComoFallo(
    userId: string,
    mes: string,
    mesGlobal: string,
    costoUsd: number,
  ): Promise<void>;
  /** -1 boleta reservada (mínimo 0), sin fallo ni costo. */
  liberar(userId: string, mes: string): Promise<void>;
}

export const USO_IA_REPOSITORY = Symbol('USO_IA_REPOSITORY');
