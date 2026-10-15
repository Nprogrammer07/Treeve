export type EstadoEcosistema = 'semilla' | 'brote' | 'arbusto' | 'arbol' | 'bosque';

export interface Ecosistema {
  readonly usuarioId: string;
  readonly experiencia: number;
  readonly nivel: number;
  readonly estado: EstadoEcosistema;
  readonly actualizadoEn: Date;
}
