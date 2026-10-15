import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesahogoGuardado } from '../../domain/entities/Desahogo';
import { PersistenceError } from '../../domain/errors';
import type { DesahogoCifrado, DesahogoRepository } from '../../domain/repositories/DesahogoRepository';
import { traducirErrorSupabase } from './traducirErrorSupabase';

/** `db` debe ser un cliente ligado al JWT del usuario para que RLS se aplique. */
export class SupabaseDesahogoRepository implements DesahogoRepository {
  constructor(private readonly db: SupabaseClient) {}

  async guardar(d: DesahogoCifrado): Promise<DesahogoGuardado> {
    const { data, error } = await this.db
      .from('desahogos')
      .insert({
        usuario_id: d.usuarioId,
        emocion_id: d.emocionId,
        intensidad: d.intensidad,
        contenido_cifrado: d.contenidoCifrado,
      })
      .select('id, creado_en')
      .single();

    if (error) throw traducirErrorSupabase(error);
    if (!data) throw new PersistenceError('El insert no devolvió datos');
    return { id: data.id as string, creadoEn: new Date(data.creado_en as string) };
  }
}
