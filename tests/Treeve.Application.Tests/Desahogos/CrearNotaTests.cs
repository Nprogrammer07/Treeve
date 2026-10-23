using System.Text;
using Treeve.Application.Desahogos;
using Treeve.Application.MensajesApoyo;
using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;

namespace Treeve.Application.Tests.Desahogos;

public class CrearNotaTests
{
    private readonly EscenarioDeNotas e = new();

    [Fact]
    public async Task Guarda_el_desahogo_con_la_fecha_la_hora_y_la_emocion_elegida()
    {
        var guardada = await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Rabia, "Hoy me enojé mucho."), CancellationToken.None);

        var nota = Assert.Single(e.Notas.Guardadas);
        Assert.Equal(guardada.NotaId, nota.Id);
        Assert.Equal(e.UsuarioId, nota.UsuarioId);
        Assert.Equal(Emocion.Rabia, nota.Emocion);
        Assert.Equal(EscenarioDeNotas.Ahora, nota.CreadaEn);
        Assert.Equal(EscenarioDeNotas.Ahora, guardada.CreadaEn);
    }

    [Fact]
    public async Task El_texto_se_guarda_cifrado_nunca_en_claro()
    {
        await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Tristeza, "Extraño a mi abuela."), CancellationToken.None);

        var nota = Assert.Single(e.Notas.Guardadas);
        Assert.DoesNotContain("abuela", Encoding.UTF8.GetString(nota.TextoCifrado), StringComparison.Ordinal);
        Assert.Equal("Extraño a mi abuela.", e.Cifrador.Descifrar(nota.TextoCifrado, ContextoDeNotas.Para(nota.Id, e.UsuarioId)));
    }

    [Fact]
    public async Task Publica_NotaCreada_con_solo_ids_y_metadatos()
    {
        var guardada = await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Miedo, "Mañana tengo examen."), CancellationToken.None);

        var evento = Assert.IsType<NotaCreada>(Assert.Single(e.Eventos.Publicados));
        Assert.Equal(guardada.NotaId, evento.NotaId);
        Assert.Equal(e.UsuarioId, evento.UsuarioId);
        Assert.Equal(Emocion.Miedo, evento.Emocion);
        Assert.Equal(EscenarioDeNotas.Ahora, evento.Fecha);
        Assert.DoesNotContain("examen", evento.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Responde_con_el_mensaje_de_apoyo_para_la_persona_y_la_emocion_elegida()
    {
        var guardada = await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Tristeza, "Hoy fue un día pesado."), CancellationToken.None);

        Assert.StartsWith("Hola, Nico.", guardada.MensajeDeApoyo.Texto, StringComparison.Ordinal);
        Assert.False(guardada.MensajeDeApoyo.EsDeCrisis);

        var peticion = Assert.Single(e.Generador.Recibidas);
        Assert.Equal(Emocion.Tristeza, peticion.Emocion);
        Assert.Equal("Hoy fue un día pesado.", peticion.Texto);
    }

    [Fact]
    public async Task Cada_respuesta_queda_en_el_historial_para_no_repetir_fragmentos()
    {
        await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Duda, "Uno."), CancellationToken.None);
        await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Duda, "Dos."), CancellationToken.None);

        Assert.Equal(2, e.Historial.Guardadas.Count);
        Assert.Equal(5, e.Generador.Recibidas[1].FragmentosRecientes.Count);
    }

    [Fact]
    public async Task Ante_una_crisis_guarda_el_desahogo_responde_con_la_sugerencia_y_no_registra_nada_mas()
    {
        e.Generador.ResponderCrisis = true;

        var guardada = await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Tristeza, "texto con señales de crisis"), CancellationToken.None);

        Assert.True(guardada.MensajeDeApoyo.EsDeCrisis);
        Assert.Equal("Nico, mensaje de crisis.", guardada.MensajeDeApoyo.Texto);
        Assert.Single(e.Notas.Guardadas);
        Assert.Empty(e.Historial.Guardadas);
    }

    [Fact]
    public async Task El_mensaje_se_arma_despues_de_guardar_la_nota_y_publicar_el_evento()
    {
        int? notasAlGenerar = null;
        int? eventosAlGenerar = null;
        var escenario = new EscenarioDeNotas(esc => new GeneradorQueObserva(() =>
        {
            notasAlGenerar = esc.Notas.Guardadas.Count;
            eventosAlGenerar = esc.Eventos.Publicados.Count;
        }));

        await escenario.CrearNota.Ejecutar(escenario.UsuarioId, new CrearNotaComando(Emocion.Duda, "Algo."), CancellationToken.None);

        Assert.Equal(1, notasAlGenerar);
        Assert.Equal(1, eventosAlGenerar);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    public async Task Un_desahogo_vacio_no_se_guarda_no_se_publica_ni_genera_mensaje(string? texto)
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Duda, texto), CancellationToken.None));

        Assert.Empty(e.Notas.Guardadas);
        Assert.Empty(e.Eventos.Publicados);
        Assert.Empty(e.Generador.Recibidas);
    }

    [Fact]
    public async Task Un_desahogo_que_pasa_del_limite_no_se_guarda_no_se_publica_ni_genera_mensaje()
    {
        var demasiado = new string('a', TextoDesahogo.LongitudMaxima + 1);

        await Assert.ThrowsAsync<ExcepcionDeDominio>(
            () => e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Duda, demasiado), CancellationToken.None));

        Assert.Empty(e.Notas.Guardadas);
        Assert.Empty(e.Eventos.Publicados);
        Assert.Empty(e.Generador.Recibidas);
    }

    [Fact]
    public async Task Cada_desahogo_es_una_nota_nueva_con_su_propio_id()
    {
        var primera = await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Duda, "Uno."), CancellationToken.None);
        var segunda = await e.CrearNota.Ejecutar(e.UsuarioId, new CrearNotaComando(Emocion.Duda, "Uno."), CancellationToken.None);

        Assert.NotEqual(primera.NotaId, segunda.NotaId);
        Assert.Equal(2, e.Notas.Guardadas.Count);
    }

    [Fact]
    public void El_comando_y_el_resultado_no_se_imprimen_con_el_texto_ni_el_nombre()
    {
        var comando = new CrearNotaComando(Emocion.Tristeza, "texto privado");

        Assert.DoesNotContain("privado", comando.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("Nico", new MensajeDeApoyoGenerado("Hola, Nico.", false).ToString(), StringComparison.Ordinal);
    }
}
