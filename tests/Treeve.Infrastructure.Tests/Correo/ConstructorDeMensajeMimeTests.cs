using Treeve.Infrastructure.Correo;

namespace Treeve.Infrastructure.Tests.Correo;

public class ConstructorDeMensajeMimeTests
{
    private static string Armar(MensajeDeCorreo? mensaje = null) =>
        AyudasDeCorreo.DecodificarRaw(ConstructorDeMensajeMime.Construir("treeve@gmail.com", mensaje ?? AyudasDeCorreo.Mensaje));

    [Fact]
    public void Lleva_remitente_y_destinatario()
    {
        var mime = Armar();

        Assert.Contains("From: treeve@gmail.com\r\n", mime, StringComparison.Ordinal);
        Assert.Contains("To: ana@correo.com\r\n", mime, StringComparison.Ordinal);
        Assert.Contains("MIME-Version: 1.0", mime, StringComparison.Ordinal);
    }

    [Fact]
    public void El_asunto_con_tildes_va_codificado_como_utf8()
    {
        var mime = Armar();

        Assert.Contains("Subject: =?UTF-8?B?", mime, StringComparison.Ordinal);
        Assert.DoesNotContain("contraseña", mime.Split("\r\n\r\n")[0], StringComparison.Ordinal);
    }

    [Fact]
    public void Un_asunto_ascii_va_tal_cual()
    {
        var mime = Armar(AyudasDeCorreo.Mensaje with { Asunto = "Hola" });

        Assert.Contains("Subject: Hola\r\n", mime, StringComparison.Ordinal);
    }

    [Fact]
    public void Trae_la_version_de_texto_y_la_version_html()
    {
        var partes = AyudasDeCorreo.Partes(Armar());

        Assert.Equal(["Hola Ani, abre https://treeve.test/r?token=abc", "<p>Hola Ani</p>"], partes);
    }

    [Fact]
    public void El_cuerpo_conserva_tildes_y_enes()
    {
        var partes = AyudasDeCorreo.Partes(Armar(AyudasDeCorreo.Mensaje with { Texto = "Contraseña de año nuevo ñandú" }));

        Assert.Equal("Contraseña de año nuevo ñandú", partes[0]);
    }

    [Fact]
    public void El_resultado_es_base64_url_sin_relleno()
    {
        var raw = ConstructorDeMensajeMime.Construir("treeve@gmail.com", AyudasDeCorreo.Mensaje);

        Assert.DoesNotContain("+", raw, StringComparison.Ordinal);
        Assert.DoesNotContain("/", raw, StringComparison.Ordinal);
        Assert.DoesNotContain("=", raw, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("ana@correo.com\r\nBcc: otra@correo.com")]
    [InlineData("ana@correo.com\nBcc: otra@correo.com")]
    public void Rechaza_saltos_de_linea_en_el_destinatario(string destinatario)
    {
        Assert.Throws<ArgumentException>(
            () => ConstructorDeMensajeMime.Construir("treeve@gmail.com", AyudasDeCorreo.Mensaje with { Para = destinatario }));
    }

    [Fact]
    public void Rechaza_saltos_de_linea_en_el_asunto_y_en_el_remitente()
    {
        Assert.Throws<ArgumentException>(
            () => ConstructorDeMensajeMime.Construir("treeve@gmail.com", AyudasDeCorreo.Mensaje with { Asunto = "Hola\r\nBcc: x@y.com" }));
        Assert.Throws<ArgumentException>(
            () => ConstructorDeMensajeMime.Construir("treeve@gmail.com\r\nBcc: x@y.com", AyudasDeCorreo.Mensaje));
    }
}
