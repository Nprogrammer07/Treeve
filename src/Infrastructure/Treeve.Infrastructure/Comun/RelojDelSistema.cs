using Treeve.Application.Comun;

namespace Treeve.Infrastructure.Comun;

/// <summary>Siempre en UTC: PostgreSQL (timestamptz) solo acepta fechas con desplazamiento cero.</summary>
internal sealed class RelojDelSistema : IReloj
{
    public DateTimeOffset Ahora => DateTimeOffset.UtcNow;
}
