export interface ServicioCifrado {
  cifrar(textoPlano: string): string;
  descifrar(payload: string): string;
}
