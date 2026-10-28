using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Treeve.Infrastructure.Persistence;

public static partial class ProteccionDeTablas
{
    /// <summary>
    /// ADR-002, punto 1: cada tabla nueva se crea con RLS habilitado y sin políticas, y sin permisos
    /// para los roles de la API pública de Supabase (anon, authenticated). Solo el backend la usa.
    /// Se llama dentro de Up() de la migración que crea la tabla.
    /// </summary>
    public static void ProtegerDeLaApiPublica(this MigrationBuilder migrationBuilder, string tabla)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);
        ValidarNombre(tabla);

        migrationBuilder.Sql($$"""
            ALTER TABLE {{TreeveDbContext.Esquema}}.{{tabla}} ENABLE ROW LEVEL SECURITY;
            DO $proteger$
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                EXECUTE 'REVOKE ALL ON TABLE {{TreeveDbContext.Esquema}}.{{tabla}} FROM anon, authenticated';
              END IF;
            END
            $proteger$;
            """);
    }

    private const string FuncionDeSoloAgregar = "impedir_cambios_en_auditoria";

    /// <summary>
    /// ADR-006: vuelve inmutable una tabla de auditoría. Un trigger rechaza todo UPDATE, DELETE o TRUNCATE, así que solo
    /// se pueden agregar filas, venga el cambio de la aplicación o de alguien con acceso a la base de datos. Solo un
    /// superusuario que quite el trigger a propósito podría saltárselo, y eso deja rastro en las migraciones.
    /// </summary>
    public static void HacerInmutable(this MigrationBuilder migrationBuilder, string tabla)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);
        ValidarNombre(tabla);

        // search_path vacío: la función no depende de qué esquema esté activo (recomendación de Supabase).
        migrationBuilder.Sql($$"""
            CREATE OR REPLACE FUNCTION {{TreeveDbContext.Esquema}}.{{FuncionDeSoloAgregar}}()
              RETURNS trigger
              LANGUAGE plpgsql
              SET search_path = ''
            AS $solo_agregar$
            BEGIN
              RAISE EXCEPTION 'La tabla % es un registro de auditoría: solo admite agregar filas.', TG_TABLE_NAME
                USING ERRCODE = 'insufficient_privilege';
            END
            $solo_agregar$;
            CREATE TRIGGER {{tabla}}_solo_agregar BEFORE UPDATE OR DELETE ON {{TreeveDbContext.Esquema}}.{{tabla}}
              FOR EACH ROW EXECUTE FUNCTION {{TreeveDbContext.Esquema}}.{{FuncionDeSoloAgregar}}();
            CREATE TRIGGER {{tabla}}_sin_vaciar BEFORE TRUNCATE ON {{TreeveDbContext.Esquema}}.{{tabla}}
              FOR EACH STATEMENT EXECUTE FUNCTION {{TreeveDbContext.Esquema}}.{{FuncionDeSoloAgregar}}();
            """);
    }

    /// <summary>Deshace <see cref="HacerInmutable"/> en el Down() de una migración.</summary>
    public static void QuitarInmutabilidad(this MigrationBuilder migrationBuilder, string tabla)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);
        ValidarNombre(tabla);

        migrationBuilder.Sql($"""
            DROP TRIGGER IF EXISTS {tabla}_solo_agregar ON {TreeveDbContext.Esquema}.{tabla};
            DROP TRIGGER IF EXISTS {tabla}_sin_vaciar ON {TreeveDbContext.Esquema}.{tabla};
            """);
    }

    /// <summary>Cuando ya ninguna tabla es inmutable (Down() de la migración que la creó).</summary>
    public static void EliminarFuncionDeSoloAgregar(this MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.Sql($"DROP FUNCTION IF EXISTS {TreeveDbContext.Esquema}.{FuncionDeSoloAgregar}();");
    }

    private static void ValidarNombre(string tabla)
    {
        if (!NombreDeTabla().IsMatch(tabla))
        {
            throw new ArgumentException("Nombre de tabla no válido.", nameof(tabla));
        }
    }

    [GeneratedRegex("^[a-z_]+$")]
    private static partial Regex NombreDeTabla();
}
