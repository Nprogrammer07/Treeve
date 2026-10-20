using System.Security.Cryptography;
using System.Text;
using Treeve.Application.Identidad;

namespace Treeve.Infrastructure.Seguridad;

/// <summary>Token de 256 bits aleatorios. En la base de datos solo se guarda su SHA-256.</summary>
internal sealed class EmisorDeTokensAleatorios : IEmisorDeTokens
{
    private const int TamanoDelToken = 32;

    public TokenDeSesion Emitir()
    {
        var bytes = RandomNumberGenerator.GetBytes(TamanoDelToken);
        var token = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        return new TokenDeSesion(token, HashDe(token));
    }

    public string HashDe(string tokenEnClaro)
    {
        ArgumentNullException.ThrowIfNull(tokenEnClaro);

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(tokenEnClaro)));
    }
}
