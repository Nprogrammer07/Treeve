using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Tests.Sugerencias;

public class SugerenciaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 26, 15, 0, 0, TimeSpan.FromHours(-5));

    [Fact]
    public void Enviar_crea_una_sugerencia_pendiente_con_id_usuario_fecha_y_texto()
    {
        var usuarioId = Guid.NewGuid();

        var sugerencia = Sugerencia.Enviar(usuarioId, TextoSugerencia.Crear(" Modo oscuro "), Ahora);

        Assert.NotEqual(Guid.Empty, sugerencia.Id);
        Assert.Equal(usuarioId, sugerencia.UsuarioId);
        Assert.Equal("Modo oscuro", sugerencia.Texto);
        Assert.Equal(EstadoSugerencia.Pendiente, sugerencia.Estado);
        Assert.Equal(Ahora, sugerencia.CreadaEn);
    }

    [Fact]
    public void Cada_sugerencia_tiene_su_propio_id()
    {
        var texto = TextoSugerencia.Crear("Más sonidos");

        Assert.NotEqual(
            Sugerencia.Enviar(Guid.NewGuid(), texto, Ahora).Id,
            Sugerencia.Enviar(Guid.NewGuid(), texto, Ahora).Id);
    }

    [Fact]
    public void Pertenece_solo_a_quien_la_envio()
    {
        var autora = Guid.NewGuid();
        var sugerencia = Sugerencia.Enviar(autora, TextoSugerencia.Crear("Más sonidos"), Ahora);

        Assert.True(sugerencia.PerteneceA(autora));
        Assert.False(sugerencia.PerteneceA(Guid.NewGuid()));
    }

    [Fact]
    public void No_imprime_el_texto()
    {
        var sugerencia = Sugerencia.Enviar(Guid.NewGuid(), TextoSugerencia.Crear("Más sonidos"), Ahora);

        Assert.DoesNotContain("sonidos", sugerencia.ToString(), StringComparison.Ordinal);
    }
}
