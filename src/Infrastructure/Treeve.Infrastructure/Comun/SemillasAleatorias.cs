using System.Security.Cryptography;
using Treeve.Application.MensajesApoyo;

namespace Treeve.Infrastructure.Comun;

internal sealed class SemillasAleatorias : IGeneradorDeSemillas
{
    public int Nueva() => RandomNumberGenerator.GetInt32(int.MaxValue);
}
