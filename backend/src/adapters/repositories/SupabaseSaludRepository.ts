import type { SupabaseClient } from '@supabase/supabase-js';
import { PersistenceError } from '../../domain/errors';
import type { SaludRepository } from '../../domain/repositories/SaludRepository';

/** Usa la función public.health_check() (ejecutable por anon): no toca tablas ni datos. */
export class SupabaseSaludRepository implements SaludRepository {
  constructor(private readonly db: SupabaseClient, private readonly timeoutMs = 3000) {}

  async verificarConexion(): Promise<void> {
    const { data, error } = await this.db
      .rpc('health_check')
      .abortSignal(AbortSignal.timeout(this.timeoutMs));
    if (error) throw new PersistenceError(error.message);
    if (!data || (data as { ok?: boolean }).ok !== true) {
      throw new PersistenceError('health_check respondió de forma inesperada');
    }
  }
}
