using Microsoft.EntityFrameworkCore;

namespace Treeve.Infrastructure.Persistence;

/// <summary>
/// Contexto de EF Core. Todas las tablas viven en el esquema "treeve", que Supabase no expone
/// en su Data API (ADR-002). Cada historia agrega sus entidades y su configuración aquí.
/// </summary>
public sealed class TreeveDbContext(DbContextOptions<TreeveDbContext> opciones) : DbContext(opciones)
{
    public const string Esquema = "treeve";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.HasDefaultSchema(Esquema);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TreeveDbContext).Assembly);
    }
}
