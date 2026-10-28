using System.Text;
using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Tests.Identidad;

internal sealed class RepositorioUsuariosFalso : IRepositorioUsuarios
{
    public List<Usuario> Guardados { get; } = [];
    public List<Credencial> Credenciales { get; } = [];

    public Task<bool> ExisteNombreDeUsuarioOCorreo(string nombreDeUsuario, string? correo, CancellationToken ct) =>
        Task.FromResult(Guardados.Any(u => u.NombreDeUsuario == nombreDeUsuario || (correo is not null && u.Correo == correo)));

    public Task Agregar(Usuario usuario, Credencial credencial, CancellationToken ct)
    {
        Guardados.Add(usuario);
        Credenciales.Add(credencial);
        return Task.CompletedTask;
    }

    public Task<Usuario?> ObtenerPorId(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.Id == usuarioId));

    public Task<Usuario?> ObtenerPorNombreDeUsuario(string nombreDeUsuario, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.NombreDeUsuario == nombreDeUsuario));

    public Task<IReadOnlyList<Usuario>> ListarStaff(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<Usuario>>(
            [.. Guardados.Where(u => u.Rol is Rol.Staff or Rol.Administrador).OrderBy(u => u.NombreDeUsuario, StringComparer.Ordinal)]);
}

/// <summary>Busca en los mismos datos que <see cref="RepositorioUsuariosFalso"/>, como lo haría la base de datos.</summary>
internal sealed class RepositorioCredencialesFalso(RepositorioUsuariosFalso usuarios) : IRepositorioCredenciales
{
    public Task<Credencial?> ObtenerPorIdentificador(string identificadorNormalizado, CancellationToken ct)
    {
        var usuario = usuarios.Guardados.FirstOrDefault(
            u => u.NombreDeUsuario == identificadorNormalizado || u.Correo == identificadorNormalizado);

        return Task.FromResult(usuario is null ? null : usuarios.Credenciales.FirstOrDefault(c => c.UsuarioId == usuario.Id));
    }

    public Task Actualizar(Credencial credencial, CancellationToken ct) => Task.CompletedTask;
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

/// <summary>Codifica el texto en Base64 junto al contexto: el texto no queda legible y el contexto se exige al descifrar.</summary>
internal sealed class CifradorFalso : ICifradorDeDatosSensibles
{
    public byte[] Cifrar(string textoPlano, string contexto) =>
        Encoding.UTF8.GetBytes($"{contexto}|{Convert.ToBase64String(Encoding.UTF8.GetBytes(textoPlano))}");

    public string Descifrar(byte[] datosCifrados, string contexto)
    {
        var partes = Encoding.UTF8.GetString(datosCifrados).Split('|');
        return partes[0] == contexto
            ? Encoding.UTF8.GetString(Convert.FromBase64String(partes[1]))
            : throw new InvalidOperationException("Contexto incorrecto.");
    }
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

internal sealed class RepositorioAuditoriaFalso : IRepositorioAuditoria
{
    public List<AccesoNoAutorizado> Registrados { get; } = [];

    public Task Registrar(AccesoNoAutorizado acceso, CancellationToken ct)
    {
        Registrados.Add(acceso);
        return Task.CompletedTask;
    }

    /// <summary>Del más reciente al más antiguo, como la base de datos. El nombre de usuario no se resuelve aquí.</summary>
    public Task<IReadOnlyList<AccesoDenegadoConNombre>> Listar(int limite, int desplazamiento, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<AccesoDenegadoConNombre>>(
            [.. Registrados.OrderByDescending(a => a.OcurrioEn).Skip(desplazamiento).Take(limite)
                .Select(a => new AccesoDenegadoConNombre(a.Id, a.UsuarioId, null, a.OcurrioEn, a.Ip, a.Recurso, a.RolRequerido))]);
}
