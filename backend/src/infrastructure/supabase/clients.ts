import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TokenVerifier } from '../../adapters/http/middlewares/authenticate';
import type { Env } from '../config/env';

const opcionesSinSesion = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Cliente anónimo (sin usuario). */
export function createAnonClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, opcionesSinSesion);
}

/** Cliente que actúa COMO el usuario: PostgREST aplica RLS con su JWT. */
export function createUserClient(env: Env, accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...opcionesSinSesion,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Valida el JWT contra Supabase Auth (revocación y expiración incluidas). */
export class SupabaseTokenVerifier implements TokenVerifier {
  constructor(private readonly anon: SupabaseClient) {}

  async verify(token: string): Promise<{ userId: string } | null> {
    const { data, error } = await this.anon.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id };
  }
}
