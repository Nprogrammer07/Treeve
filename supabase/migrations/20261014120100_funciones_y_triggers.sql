-- =====================================================================
-- Treeve · [S1] TEC-02 · Migración 2/4 · Funciones y triggers
-- Todas las funciones SECURITY DEFINER fijan search_path vacío y usan
-- nombres totalmente calificados (evita secuestro de search_path).
-- =====================================================================

-- ---------- Helpers de rol (usados por las políticas RLS) ----------
-- SECURITY DEFINER evita recursión de RLS al consultar public.usuarios.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql stable security definer
set search_path = ''
as $$
  select u.rol from public.usuarios u
  where u.id = (select auth.uid()) and u.activo
$$;

create or replace function public.es_staff_o_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select public.rol_actual()) in ('staff', 'administrador'), false)
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select public.rol_actual()) = 'administrador', false)
$$;

-- ---------- Alta automática de perfil + ecosistema al registrarse ----------
-- IMPORTANTE: el rol NUNCA se toma de raw_user_meta_data (lo controla el cliente).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_alias text;
begin
  v_alias := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'alias', '')), '');
  if v_alias is null or char_length(v_alias) not between 2 and 50 then
    v_alias := 'usuario_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.usuarios (id, alias) values (new.id, v_alias);
  insert into public.ecosistema (usuario_id) values (new.id);
  insert into public.auditoria (actor_id, accion, entidad, entidad_id)
  values (new.id, 'registro_usuario', 'usuarios', new.id::text);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Ecosistema: recálculo idempotente (no confía en el cliente) ----------
-- 10 XP por desahogo; 1 nivel cada 50 XP.
create or replace function public.recalcular_ecosistema(p_usuario_id uuid)
returns public.ecosistema
language plpgsql security definer
set search_path = ''
as $$
declare
  v_total  integer;
  v_exp    integer;
  v_nivel  smallint;
  v_estado public.estado_ecosistema;
  v_fila   public.ecosistema;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_usuario_id then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select count(*) into v_total from public.desahogos where usuario_id = p_usuario_id;

  v_exp   := v_total * 10;
  v_nivel := (v_exp / 50) + 1;
  v_estado := case
    when v_nivel >= 10 then 'bosque'::public.estado_ecosistema
    when v_nivel >= 7  then 'arbol'::public.estado_ecosistema
    when v_nivel >= 4  then 'arbusto'::public.estado_ecosistema
    when v_nivel >= 2  then 'brote'::public.estado_ecosistema
    else 'semilla'::public.estado_ecosistema
  end;

  update public.ecosistema
     set experiencia = v_exp, nivel = v_nivel, estado = v_estado
   where usuario_id = p_usuario_id
   returning * into v_fila;

  return v_fila;
end;
$$;

-- ---------- Cambio de rol (solo administrador, siempre auditado) ----------
create or replace function public.cambiar_rol_usuario(p_usuario_id uuid, p_nuevo_rol public.rol_usuario)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_rol_anterior public.rol_usuario;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles' using errcode = '42501';
  end if;
  if p_nuevo_rol = 'visitante' then
    raise exception 'El rol visitante no puede asignarse a usuarios registrados' using errcode = '22023';
  end if;
  if p_usuario_id = (select auth.uid()) then
    raise exception 'No puedes cambiar tu propio rol' using errcode = '42501';
  end if;

  select rol into v_rol_anterior from public.usuarios where id = p_usuario_id;
  if not found then
    raise exception 'Usuario inexistente' using errcode = 'P0002';
  end if;

  update public.usuarios set rol = p_nuevo_rol where id = p_usuario_id;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values ((select auth.uid()), 'cambio_rol', 'usuarios', p_usuario_id::text,
          jsonb_build_object('rol_anterior', v_rol_anterior, 'rol_nuevo', p_nuevo_rol));
end;
$$;

-- ---------- Sugerencias: registra quién gestiona y audita cambios de estado ----------
create or replace function public.tg_sugerencias_gestion()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    new.atendida_por := (select auth.uid());
    insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
    values ((select auth.uid()), 'sugerencia_cambio_estado', 'sugerencias', new.id::text,
            jsonb_build_object('estado_anterior', old.estado, 'estado_nuevo', new.estado));
  end if;
  return new;
end;
$$;

create trigger sugerencias_gestion
  before update on public.sugerencias
  for each row execute function public.tg_sugerencias_gestion();

-- ---------- Auditoría inmutable (solo INSERT) ----------
create or replace function public.tg_auditoria_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La tabla auditoria es de solo anexado' using errcode = '42501';
end;
$$;

create trigger auditoria_sin_update_delete
  before update or delete on public.auditoria
  for each row execute function public.tg_auditoria_inmutable();

create trigger auditoria_sin_truncate
  before truncate on public.auditoria
  for each statement execute function public.tg_auditoria_inmutable();

-- ---------- Health check (lo usa GET /health del backend) ----------
create or replace function public.health_check()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object('ok', true, 'ts', now())
$$;
