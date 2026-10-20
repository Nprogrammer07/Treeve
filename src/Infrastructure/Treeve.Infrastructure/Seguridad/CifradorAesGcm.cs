using System.Security.Cryptography;
using System.Text;
using Treeve.Application.Comun;

namespace Treeve.Infrastructure.Seguridad;

/// <summary>
/// AES-256-GCM (ADR-002). Formato guardado: [versión de llave, 1 byte][nonce, 12][etiqueta, 16][texto cifrado].
/// El contexto viaja como datos autenticados adicionales: no se guarda, pero sin él no se puede descifrar.
/// La versión de llave permite rotarla más adelante sin perder lo ya cifrado.
/// </summary>
internal sealed class CifradorAesGcm : ICifradorDeDatosSensibles
{
    public const int TamanoDeLlave = 32;

    private const byte VersionDeLlave = 1;
    private const int TamanoDeNonce = 12;
    private const int TamanoDeEtiqueta = 16;
    private const int TamanoDeCabecera = 1 + TamanoDeNonce + TamanoDeEtiqueta;

    private readonly byte[] llave;

    public CifradorAesGcm(byte[] llave)
    {
        ArgumentNullException.ThrowIfNull(llave);

        if (llave.Length != TamanoDeLlave)
        {
            throw new ArgumentException($"La llave de cifrado debe tener {TamanoDeLlave} bytes.", nameof(llave));
        }

        this.llave = [.. llave];
    }

    public byte[] Cifrar(string textoPlano, string contexto)
    {
        ArgumentNullException.ThrowIfNull(textoPlano);
        ArgumentException.ThrowIfNullOrEmpty(contexto);

        var plano = Encoding.UTF8.GetBytes(textoPlano);
        var resultado = new byte[TamanoDeCabecera + plano.Length];
        resultado[0] = VersionDeLlave;

        var nonce = resultado.AsSpan(1, TamanoDeNonce);
        RandomNumberGenerator.Fill(nonce);

        using var aes = new AesGcm(llave, TamanoDeEtiqueta);
        aes.Encrypt(
            nonce,
            plano,
            resultado.AsSpan(TamanoDeCabecera),
            resultado.AsSpan(1 + TamanoDeNonce, TamanoDeEtiqueta),
            Encoding.UTF8.GetBytes(contexto));

        CryptographicOperations.ZeroMemory(plano);
        return resultado;
    }

    public string Descifrar(byte[] datosCifrados, string contexto)
    {
        ArgumentNullException.ThrowIfNull(datosCifrados);
        ArgumentException.ThrowIfNullOrEmpty(contexto);

        if (datosCifrados.Length < TamanoDeCabecera || datosCifrados[0] != VersionDeLlave)
        {
            throw new CryptographicException("Formato de datos cifrados no reconocido.");
        }

        var plano = new byte[datosCifrados.Length - TamanoDeCabecera];

        // Si el contexto, la llave o los datos no coinciden, AES-GCM lanza CryptographicException.
        using var aes = new AesGcm(llave, TamanoDeEtiqueta);
        aes.Decrypt(
            datosCifrados.AsSpan(1, TamanoDeNonce),
            datosCifrados.AsSpan(TamanoDeCabecera),
            datosCifrados.AsSpan(1 + TamanoDeNonce, TamanoDeEtiqueta),
            plano,
            Encoding.UTF8.GetBytes(contexto));

        return Encoding.UTF8.GetString(plano);
    }
}
