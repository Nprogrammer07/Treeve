using Treeve.Infrastructure.Correo;

namespace Treeve.Infrastructure.Tests.Correo;

public class NotificadorDeRecuperacionPorCorreoTests
{
    private static readonly DateTimeOffset Expira = new(2026, 10, 29, 15, 30, 0, TimeSpan.Zero); // 10:30 a. m. en Colombia

    private sealed class EnviadorQueGuarda : IEnviadorDeCorreo
    {
        public List<MensajeDeCorreo> Enviados { get; } = [];

        public Task Enviar(MensajeDeCorreo mensaje, CancellationToken ct)
        {
            Enviados.Add(mensaje);
            return Task.CompletedTask;
        }
    }

    private readonly EnviadorQueGuarda enviador = new();

    private Task Notificar(string url, string token = "abc-DEF_123", string apodo = "Ani") =>
        new NotificadorDeRecuperacionPorCorreo(enviador, new Uri(url)).Enviar("ana@correo.com", apodo, token, Expira, CancellationToken.None);

    [Fact]
    public async Task El_enlace_lleva_el_token_en_el_parametro_token()
    {
        await Notificar("https://treeve.vercel.app/restablecer-contrasena");

        var mensaje = Assert.Single(enviador.Enviados);
        Assert.Equal("ana@correo.com", mensaje.Para);
        Assert.Contains("https://treeve.vercel.app/restablecer-contrasena?token=abc-DEF_123", mensaje.Texto, StringComparison.Ordinal);
        Assert.Contains("https://treeve.vercel.app/restablecer-contrasena?token=abc-DEF_123", mensaje.Html, StringComparison.Ordinal);
    }

    [Fact]
    public void Respeta_los_parametros_que_ya_tenga_la_direccion_base()
    {
        var enlace = NotificadorDeRecuperacionPorCorreo.ConstruirEnlace(new Uri("https://treeve.test/r?origen=correo"), "abc");

        Assert.Equal("https://treeve.test/r?origen=correo&token=abc", enlace);
    }

    [Fact]
    public async Task Dice_hasta_que_hora_sirve_en_hora_de_Colombia()
    {
        await Notificar("https://treeve.test/r");

        Assert.Contains("10:30", Assert.Single(enviador.Enviados).Texto, StringComparison.Ordinal);
    }

    [Fact]
    public async Task El_apodo_se_escapa_en_el_html()
    {
        await Notificar("https://treeve.test/r", apodo: "<script>x</script>");

        var mensaje = Assert.Single(enviador.Enviados);
        Assert.DoesNotContain("<script>", mensaje.Html, StringComparison.Ordinal);
        Assert.Contains("&lt;script&gt;", mensaje.Html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Sin_apodo_saluda_sin_nombre()
    {
        await Notificar("https://treeve.test/r", apodo: string.Empty);

        Assert.StartsWith("Hola.", Assert.Single(enviador.Enviados).Texto, StringComparison.Ordinal);
    }

    [Fact]
    public void El_mensaje_no_imprime_su_contenido()
    {
        Assert.DoesNotContain("abc", AyudasDeCorreo.Mensaje.ToString(), StringComparison.Ordinal);
    }
}
