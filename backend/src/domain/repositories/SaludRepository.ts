export interface SaludRepository {
  /** Lanza si la base de datos no responde. */
  verificarConexion(): Promise<void>;
}
