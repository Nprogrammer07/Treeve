import type { SupabaseClient } from '@supabase/supabase-js';
import type { Ecosistema, EstadoEcosistema } from '../../domain/entities/Ecosistema';
import { PersistenceError } from '../../domain/errors';
import type { EcosistemaRepository } from '../../domain/repositories/EcosistemaRepository';
import { traducirErrorSupabase } from './traducirErrorSupabase';

export class SupabaseEcosistemaRepository implements EcosistemaRepository {
  constructor(private readonly db: SupabaseClient) {}

  async recalcular(usuarioId: string): Promise<Ecosistema> {
    const { data, error } = await this.db.rpc('recalcular_ecosistema', { p_usuario_id: usuarioId });
    if (error) throw traducirErrorSupabase(error);
    if (!data || !data.usuario_id) throw new PersistenceError('Ecosistema inexistente para el usuario');
    return {
      usuarioId: data.usuario_id as string,
      experiencia: data.experiencia as number,
      nivel: data.nivel as number,
      estado: data.estado as EstadoEcosistema,
      actualizadoEn: new Date(data.actualizado_en as string),
    };
  }
}
