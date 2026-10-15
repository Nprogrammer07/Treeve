-- =====================================================================
-- Treeve · [S1] TEC-02 · Migración 1/4 · Esquema inicial
-- Tipos, tablas, llaves foráneas, restricciones e índices.
-- Las contraseñas NO viven aquí: las gestiona Supabase Auth (auth.users,
-- hash bcrypt). public.usuarios es el perfil de aplicación (1:1 con auth.users).
-- =====================================================================

-- ---------- Enumeraciones ----------
create type public.rol_usuario as enum ('visitante', 'usuario', 'staff', 'administrador');
comment on type public.rol_usuario is
  '"visitante" = sesión anónima (sin fila en usuarios). Los demás roles se almacenan en usuarios.rol.';

create type public.estado_ecosistema as enum ('semilla', 'brote', 'arbusto', 'arbol', 'bosque');
create type public.estado_sugerencia as enum ('pendiente', 'en_revision', 'resuelta', 'descartada');

-- ---------- Utilidad: sello de actualización ----------
create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- ---------- usuarios (perfil 1:1 con auth.users) ----------
create table public.usuarios (
  id             uuid primary key references auth.users (id) on delete cascade,
  alias          varchar(50) not null,
  rol            public.rol_usuario not null default 'usuario',
  activo         boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint usuarios_alias_longitud check (char_length(btrim(alias)) between 2 and 50),
  constraint usuarios_rol_registrado check (rol <> 'visitante')
);
create index usuarios_rol_idx on public.usuarios (rol);
create trigger usuarios_actualizado_en before update on public.usuarios
  for each row execute function public.set_actualizado_en();

-- ---------- emociones (catálogo) ----------
create table public.emociones (
  id          smallint generated always as identity primary key,
  codigo      varchar(30) not null unique,
  nombre      varchar(60) not null,
  descripcion text,
  activa      boolean not null default true,
  creado_en   timestamptz not null default now(),
  constraint emociones_codigo_formato check (codigo ~ '^[a-z_]+$')
);

-- ---------- desahogos (contenido cifrado en la capa de aplicación) ----------
create table public.desahogos (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null references public.usuarios (id) on delete cascade,
  emocion_id        smallint not null references public.emociones (id),
  contenido_cifrado text not null,
  intensidad        smallint not null,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  constraint desahogos_intensidad_rango check (intensidad between 1 and 5),
  -- Defensa en profundidad: rechaza texto plano; exige "v<version>:iv:tag:ciphertext"
  constraint desahogos_formato_cifrado check (contenido_cifrado ~ '^v[0-9]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$')
);
comment on column public.desahogos.contenido_cifrado is
  'AES-256-GCM generado por el backend. La clave NUNCA se almacena en la base de datos.';
create index desahogos_usuario_fecha_idx on public.desahogos (usuario_id, creado_en desc);
create index desahogos_emocion_idx on public.desahogos (emocion_id);
create trigger desahogos_actualizado_en before update on public.desahogos
  for each row execute function public.set_actualizado_en();

-- ---------- ecosistema (1 por usuario; se deriva de los desahogos) ----------
create table public.ecosistema (
  usuario_id     uuid primary key references public.usuarios (id) on delete cascade,
  experiencia    integer not null default 0,
  nivel          smallint not null default 1,
  estado         public.estado_ecosistema not null default 'semilla',
  actualizado_en timestamptz not null default now(),
  constraint ecosistema_experiencia_no_negativa check (experiencia >= 0),
  constraint ecosistema_nivel_minimo check (nivel >= 1)
);
create trigger ecosistema_actualizado_en before update on public.ecosistema
  for each row execute function public.set_actualizado_en();

-- ---------- mensaje_apoyo (catálogo de mensajes por emoción) ----------
create table public.mensaje_apoyo (
  id         uuid primary key default gen_random_uuid(),
  emocion_id smallint not null references public.emociones (id) on delete cascade,
  texto      text not null,
  activo     boolean not null default true,
  creado_por uuid references public.usuarios (id) on delete set null,
  creado_en  timestamptz not null default now(),
  constraint mensaje_apoyo_texto_longitud check (char_length(btrim(texto)) between 1 and 500)
);
create index mensaje_apoyo_emocion_idx on public.mensaje_apoyo (emocion_id) where activo;

-- ---------- sugerencias ----------
create table public.sugerencias (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid references public.usuarios (id) on delete set null,
  contenido      text not null,
  estado         public.estado_sugerencia not null default 'pendiente',
  atendida_por   uuid references public.usuarios (id) on delete set null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint sugerencias_contenido_longitud check (char_length(btrim(contenido)) between 5 and 2000)
);
create index sugerencias_estado_idx on public.sugerencias (estado, creado_en desc);
create trigger sugerencias_actualizado_en before update on public.sugerencias
  for each row execute function public.set_actualizado_en();

-- ---------- auditoria (solo anexado) ----------
-- actor_id SIN llave foránea a propósito: el rastro debe sobrevivir al borrado del usuario.
create table public.auditoria (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  accion     varchar(60) not null,
  entidad    varchar(60) not null,
  entidad_id text,
  detalle    jsonb not null default '{}'::jsonb,
  creado_en  timestamptz not null default now()
);
comment on table public.auditoria is 'Nunca registrar contenido de desahogos aquí.';
create index auditoria_fecha_idx on public.auditoria (creado_en desc);
create index auditoria_actor_idx on public.auditoria (actor_id);
