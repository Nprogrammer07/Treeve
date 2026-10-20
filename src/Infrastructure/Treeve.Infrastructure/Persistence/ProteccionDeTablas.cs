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

        if (!NombreDeTabla().IsMatch(tabla))
        {
            throw new ArgumentException("Nombre de tabla no válido.", nameof(tabla));
        }

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

    [GeneratedRegex("^[a-z_]+$")]
    private static partial Regex NombreDeTabla();
}
