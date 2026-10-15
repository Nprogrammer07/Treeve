import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { ServicioCifrado } from '../../domain/services/ServicioCifrado';

const VERSION = 'v1';

/**
 * AES-256-GCM con IV aleatorio de 96 bits por mensaje.
 * Formato: v1:<iv>:<authTag>:<ciphertext> (base64). El prefijo de versión permite rotar claves.
 */
export class AesGcmServicioCifrado implements ServicioCifrado {
  private readonly clave: Buffer;

  constructor(claveBase64: string) {
    this.clave = Buffer.from(claveBase64, 'base64');
    if (this.clave.length !== 32) throw new Error('ENCRYPTION_KEY debe tener 32 bytes');
  }

  cifrar(textoPlano: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.clave, iv);
    const cifrado = Buffer.concat([cipher.update(textoPlano, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64'), tag.toString('base64'), cifrado.toString('base64')].join(':');
  }

  descifrar(payload: string): string {
    const [version, iv, tag, cifrado] = payload.split(':');
    if (version !== VERSION || !iv || !tag || !cifrado) throw new Error('Formato de cifrado no soportado');
    const decipher = createDecipheriv('aes-256-gcm', this.clave, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(cifrado, 'base64')), decipher.final()]).toString('utf8');
  }
}
