using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Tests.Identidad;

internal sealed class RepositorioUsuariosFalso : IRepositorioUsuarios
{
    public List<Usuario> Guardados { get; } = [];

    public Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct) =>
        Task.FromResult(Guardados.Any(u => u.NombreDeUsuario == nombreDeUsuario || (correo is not null && u.Correo == correo)));

    public Task Agregar(Usuario usuario, CancellationToken ct)
    {
        Guardados.Add(usuario);
        return Task.CompletedTask;
    }

    public Task<Usuario?> ObtenerPorIdentificador(string identificadorNormalizado, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.NombreDeUsuario == identificadorNormalizado || u.Correo == identificadorNormalizado));

    public Task Actualizar(Usuario usuario, CancellationToken ct) => Task.CompletedTask;
}

internal sealed class RepositorioSesionesFalso : IRepositorioSesiones
{
    public List<Sesion> Guardadas { get; } = [];

    public Task Agregar(Sesion sesion, CancellationToken ct)
    {
        Guardadas.Add(sesion);
        return Task.CompletedTask;
    }

    public Task<Sesion?> ObtenerVigentePorTokenHash(string tokenHash, DateTimeOffset ahora, CancellationToken ct) =>
        Task.FromResult(Guardadas.FirstOrDefault(s => s.TokenHash == tokenHash && s.EstaVigente(ahora)));
}

/// <summary>Antepone un prefijo: basta para comprobar que la contraseña no se guarda en claro.</summary>
internal sealed class HasheadorFalso : IHasheadorDeContrasenas
{
    public string Hashear(string contrasena) => "hash:" + contrasena;

    public bool Verificar(string? hash, string contrasena) => hash is not null && hash == Hashear(contrasena);
}

internal sealed class EmisorDeTokensFalso : IEmisorDeTokens
{
    private int contador;

    public TokenDeSesion Emitir()
    {
        contador++;
        var token = $"token-{contador}";
        return new TokenDeSesion(token, HashDe(token));
    }

    public string HashDe(string tokenEnClaro) => "h(" + tokenEnClaro + ")";
}

/// <summary>Reloj que se puede adelantar, para probar vencimientos.</summary>
internal sealed class RelojManual(DateTimeOffset inicio) : IReloj
{
    public DateTimeOffset Ahora { get; private set; } = inicio;

    public void Avanzar(TimeSpan tiempo) => Ahora += tiempo;
}
