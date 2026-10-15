-- =====================================================================
-- Treeve · [S1] TEC-02 · Migración 3/4 · RLS, privilegios y políticas
-- Modelo: mínimo privilegio. Primero se revoca todo; luego se concede
-- solo lo necesario y RLS decide QUÉ FILAS ve/modifica cada rol.
-- service_role (clave secreta) omite RLS: jamás debe usarse en el cliente.
-- =====================================================================

-- ---------- 1. Activar RLS en TODAS las tablas ----------
alter table public.usuarios      enable row level security;
alter table public.emociones     enable row level security;
alter table public.desahogos     enable row level security;
alter table public.ecosistema    enable row level security;
alter table public.mensaje_apoyo enable row level security;
alter table public.sugerencias   enable row level security;
alter table public.auditoria     enable row level security;

-- ---------- 2. Revocar privilegios por defecto ----------
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------- 3. Concesiones mínimas ----------
grant select on public.emociones to anon, authenticated;                 -- visitantes ven el catálogo
grant insert, update, delete on public.emociones to authenticated;       -- RLS: solo administrador
grant select, insert, update, delete on public.mensaje_apoyo to authenticated;
grant select on public.usuarios to authenticated;
grant update (alias) on public.usuarios to authenticated;                -- el rol NO es modificable por esta vía
grant select, insert, update, delete on public.desahogos to authenticated;
grant select on public.ecosistema to authenticated;                      -- solo lectura; se modifica vía recalcular_ecosistema()
grant select, insert on public.sugerencias to authenticated;
grant update (estado) on public.sugerencias to authenticated;            -- RLS: solo staff/admin
grant select on public.auditoria to authenticated;                       -- RLS: solo staff/admin

grant execute on function public.health_check()                          to anon, authenticated;
grant execute on function public.rol_actual()                            to authenticated;
grant execute on function public.es_staff_o_admin()                      to authenticated;
grant execute on function public.es_admin()                              to authenticated;
grant execute on function public.recalcular_ecosistema(uuid)             to authenticated;
grant execute on function public.cambiar_rol_usuario(uuid, public.rol_usuario) to authenticated;

-- ---------- 4. usuarios ----------
create policy usuarios_select_propio on public.usuarios
  for select to authenticated
  using (id = (select auth.uid()));

create policy usuarios_select_admin on public.usuarios
  for select to authenticated
  using ((select public.es_admin()));

create policy usuarios_update_propio on public.usuarios
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Sin INSERT (lo hace el trigger de registro) ni DELETE (cascada desde auth.users).

-- ---------- 5. desahogos: SOLO su dueño (ni staff ni administrador) ----------
create policy desahogos_select_propios on public.desahogos
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy desahogos_insert_propios on public.desahogos
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and (select public.rol_actual()) is not null          -- cuenta activa
  );

create policy desahogos_update_propios on public.desahogos
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy desahogos_delete_propios on public.desahogos
  for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- ---------- 6. ecosistema: lectura propia ----------
create policy ecosistema_select_propio on public.ecosistema
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- ---------- 7. emociones ----------
create policy emociones_select_publico on public.emociones
  for select to anon, authenticated
  using (activa);

create policy emociones_select_gestion on public.emociones
  for select to authenticated
  using ((select public.es_staff_o_admin()));

create policy emociones_insert_admin on public.emociones
  for insert to authenticated
  with check ((select public.es_admin()));

create policy emociones_update_admin on public.emociones
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy emociones_delete_admin on public.emociones
  for delete to authenticated
  using ((select public.es_admin()));

-- ---------- 8. mensaje_apoyo ----------
create policy mensaje_apoyo_select_activos on public.mensaje_apoyo
  for select to authenticated
  using (activo);

create policy mensaje_apoyo_select_gestion on public.mensaje_apoyo
  for select to authenticated
  using ((select public.es_staff_o_admin()));

create policy mensaje_apoyo_insert_gestion on public.mensaje_apoyo
  for insert to authenticated
  with check ((select public.es_staff_o_admin()));

create policy mensaje_apoyo_update_gestion on public.mensaje_apoyo
  for update to authenticated
  using ((select public.es_staff_o_admin()))
  with check ((select public.es_staff_o_admin()));

create policy mensaje_apoyo_delete_gestion on public.mensaje_apoyo
  for delete to authenticated
  using ((select public.es_staff_o_admin()));

-- ---------- 9. sugerencias: cualquier usuario envía; solo staff/admin lee y gestiona ----------
-- Nota: como el usuario no puede hacer SELECT, el INSERT debe hacerse sin RETURNING
-- (en supabase-js: .insert(...) sin .select()).
create policy sugerencias_insert_propias on public.sugerencias
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and (select public.rol_actual()) is not null
  );

create policy sugerencias_select_gestion on public.sugerencias
  for select to authenticated
  using ((select public.es_staff_o_admin()));

create policy sugerencias_update_gestion on public.sugerencias
  for update to authenticated
  using ((select public.es_staff_o_admin()))
  with check ((select public.es_staff_o_admin()));

-- ---------- 10. auditoria: lectura staff/admin; escritura solo vía triggers/funciones/service_role ----------
create policy auditoria_select_gestion on public.auditoria
  for select to authenticated
  using ((select public.es_staff_o_admin()));
