using System.Security.Cryptography;
using System.Text;
using Treeve.Infrastructure.Seguridad;

namespace Treeve.Infrastructure.Tests.Seguridad;

public class CifradorAesGcmTests
{
    private const string Contexto = "usuarios.motivo_de_registro:7a3c0f0e-0000-0000-0000-000000000001";
    private const string Texto = "Quiero un espacio para mí";

    private static readonly byte[] Llave = RandomNumberGenerator.GetBytes(CifradorAesGcm.TamanoDeLlave);

    private readonly CifradorAesGcm cifrador = new(Llave);

    [Fact]
    public void Descifra_lo_que_cifro_con_el_mismo_contexto()
    {
        var cifrado = cifrador.Cifrar(Texto, Contexto);

        Assert.Equal(Texto, cifrador.Descifrar(cifrado, Contexto));
    }

    [Fact]
    public void El_texto_no_queda_legible()
    {
        var cifrado = cifrador.Cifrar(Texto, Contexto);

        Assert.DoesNotContain("espacio", Encoding.UTF8.GetString(cifrado), StringComparison.Ordinal);
    }

    [Fact]
    public void El_mismo_texto_se_cifra_distinto_cada_vez()
    {
        Assert.NotEqual(cifrador.Cifrar(Texto, Contexto), cifrador.Cifrar(Texto, Contexto));
    }

    [Fact]
    public void Lleva_la_version_de_la_llave_en_el_primer_byte()
    {
        Assert.Equal(1, cifrador.Cifrar(Texto, Contexto)[0]);
    }

    [Fact]
    public void Con_otro_contexto_no_se_descifra()
    {
        var cifrado = cifrador.Cifrar(Texto, Contexto);

        // Copiado a otra fila o a otro usuario, el dato no sirve.
        Assert.ThrowsAny<CryptographicException>(() => cifrador.Descifrar(cifrado, "usuarios.motivo_de_registro:otro"));
    }

    [Fact]
    public void Con_otra_llave_no_se_descifra()
    {
        var cifrado = cifrador.Cifrar(Texto, Contexto);
        var otro = new CifradorAesGcm(RandomNumberGenerator.GetBytes(CifradorAesGcm.TamanoDeLlave));

        Assert.ThrowsAny<CryptographicException>(() => otro.Descifrar(cifrado, Contexto));
    }

    [Fact]
    public void Un_dato_alterado_no_se_descifra()
    {
        var cifrado = cifrador.Cifrar(Texto, Contexto);
        cifrado[^1] ^= 0xFF;

        Assert.ThrowsAny<CryptographicException>(() => cifrador.Descifrar(cifrado, Contexto));
    }

    [Theory]
    [InlineData(16)]
    [InlineData(31)]
    [InlineData(64)]
    public void Rechaza_llaves_que_no_son_de_32_bytes(int tamano)
    {
        Assert.Throws<ArgumentException>(() => new CifradorAesGcm(new byte[tamano]));
    }
}
