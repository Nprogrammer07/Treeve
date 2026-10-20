using System.Security.Cryptography;
using Treeve.Application.Identidad;

namespace Treeve.Infrastructure.Seguridad;

/// <summary>
/// PBKDF2-HMAC-SHA256 con sal aleatoria por contraseña (recomendación de OWASP: 600 000 iteraciones).
/// Formato guardado: pbkdf2-sha256$iteraciones$sal$hash (base64). Las iteraciones viajan en el hash,
/// así se pueden subir más adelante sin invalidar las contraseñas existentes.
/// </summary>
internal sealed class HasheadorDeContrasenasPbkdf2 : IHasheadorDeContrasenas
{
    private const string Prefijo = "pbkdf2-sha256";
    private const int TamanoDeSal = 16;
    private const int TamanoDeHash = 32;
    private const int Iteraciones = 600_000;
    private const int IteracionesMaximas = 10_000_000;

    private static readonly byte[] SalFalsa = new byte[TamanoDeSal];

    public string Hashear(string contrasena)
    {
        ArgumentNullException.ThrowIfNull(contrasena);

        var sal = RandomNumberGenerator.GetBytes(TamanoDeSal);
        var hash = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, Iteraciones, HashAlgorithmName.SHA256, TamanoDeHash);

        return $"{Prefijo}${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }

    public bool Verificar(string? hash, string contrasena)
    {
        ArgumentNullException.ThrowIfNull(contrasena);

        if (hash is null)
        {
            // El usuario no existe: se hace el mismo trabajo para que la respuesta no tarde menos.
            _ = Rfc2898DeriveBytes.Pbkdf2(contrasena, SalFalsa, Iteraciones, HashAlgorithmName.SHA256, TamanoDeHash);
            return false;
        }

        var partes = hash.Split('$');
        if (partes.Length != 4 || partes[0] != Prefijo ||
            !int.TryParse(partes[1], out var iteraciones) || iteraciones is < 1 or > IteracionesMaximas)
        {
            return false;
        }

        byte[] sal;
        byte[] esperado;
        try
        {
            sal = Convert.FromBase64String(partes[2]);
            esperado = Convert.FromBase64String(partes[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var calculado = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, iteraciones, HashAlgorithmName.SHA256, esperado.Length);
        return CryptographicOperations.FixedTimeEquals(calculado, esperado);
    }
}
