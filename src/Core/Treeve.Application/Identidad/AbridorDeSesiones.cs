using Treeve.Application.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

public sealed record SesionIniciada(Guid UsuarioId, string Apodo, string Token, DateTimeOffset ExpiraEn)
{
    public override string ToString() => "[sesión iniciada]";
}

/// <summary>Abre una sesión para un usuario. Lo usan el registro (acceso automático) y, luego, el login.</summary>
public sealed class AbridorDeSesiones(IRepositorioSesiones sesiones, IEmisorDeTokens tokens, IReloj reloj)
{
    /// <summary>Duración de una sesión. Valor propuesto, por confirmar con el PO.</summary>
    public static readonly TimeSpan DuracionDeSesion = TimeSpan.FromDays(7);

    public async Task<SesionIniciada> Abrir(Usuario usuario, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(usuario);

        var token = tokens.Emitir();
        var sesion = Sesion.Abrir(usuario.Id, token.Hash, reloj.Ahora, DuracionDeSesion);

        await sesiones.Agregar(sesion, ct);

        return new SesionIniciada(usuario.Id, usuario.Apodo, token.Valor, sesion.ExpiraEn);
    }
}
