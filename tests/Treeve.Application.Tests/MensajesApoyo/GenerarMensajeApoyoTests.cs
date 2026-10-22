using System.Text;
using Treeve.Application.Comun;
using Treeve.Application.MensajesApoyo;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Application.Tests.MensajesApoyo;

public class GenerarMensajeApoyoTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 22, 21, 0, 0, TimeSpan.Zero);

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly HistorialRespuestasFalso historial = new();
    private readonly GeneradorFalso generador = new();
    private readonly CifradorFalso cifrador = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly GenerarMensajeApoyo generar;
    private readonly Guid usuarioId = Guid.NewGuid();

    public GenerarMensajeApoyoTests()
    {
        var datos = DatosDeRegistro.Crear("Nicolás Pérez", "Nico", "nico", null, null);
        usuarios.Guardados.Add(Usuario.Registrar(usuarioId, datos, null, Ahora));
        generar = new GenerarMensajeApoyo(generador, historial, usuarios, cifrador, new SemillasFijas(), reloj);
    }

    private async Task<MensajeDeApoyoGenerado> Generar(string texto = "Hoy fue un día pesado.")
    {
        var mensaje = await generar.Ejecutar(new GenerarMensajeApoyoComando(usuarioId, Emocion.Tristeza, texto), CancellationToken.None);
        reloj.Avanzar(TimeSpan.FromMinutes(1));
        return mensaje;
    }

    [Fact]
    public async Task Arma_el_mensaje_con_el_apodo_guardado_y_la_emocion_elegida()
    {
        var mensaje = await Generar();

        Assert.StartsWith("Hola, Nico.", mensaje.Texto, StringComparison.Ordinal);
        Assert.False(mensaje.EsDeCrisis);
        var peticion = Assert.Single(generador.Recibidas);
        Assert.Equal(Emocion.Tristeza, peticion.Emocion);
        Assert.Equal(42, peticion.Semilla);
    }

    [Fact]
    public async Task Guarda_los_fragmentos_usados_cifrados_nunca_en_claro()
    {
        await Generar();

        var respuesta = Assert.Single(historial.Guardadas);
        Assert.DoesNotContain("GEN-REF-01", Encoding.UTF8.GetString(respuesta.FragmentosCifrados), StringComparison.Ordinal);
        Assert.Equal(
            "GEN-SAL-01,GEN-VAL-01,GEN-REF-01,GEN-CON-01,GEN-PUE-01",
            cifrador.Descifrar(respuesta.FragmentosCifrados, GenerarMensajeApoyo.ContextoDelHistorial(usuarioId, respuesta.Id)));
    }

    [Fact]
    public async Task Le_pasa_al_motor_los_fragmentos_recientes_del_mas_nuevo_al_mas_viejo()
    {
        await Generar();
        await Generar();
        await Generar();

        var recientes = generador.Recibidas[^1].FragmentosRecientes;
        Assert.Equal(10, recientes.Count);
        Assert.Equal("GEN-SAL-02", recientes[0]);
        Assert.Equal("GEN-SAL-01", recientes[5]);
    }

    [Fact]
    public async Task Solo_conserva_las_respuestas_que_sirven_para_no_repetir()
    {
        for (var i = 0; i < MotorDeRespuesta.RespuestasSinRepetir + 3; i++)
        {
            await Generar();
        }

        Assert.Equal(MotorDeRespuesta.RespuestasSinRepetir, historial.Guardadas.Count);
    }

    [Fact]
    public async Task Ante_una_crisis_no_guarda_nada()
    {
        generador.ResponderCrisis = true;

        var mensaje = await Generar("texto con señales de crisis");

        Assert.True(mensaje.EsDeCrisis);
        Assert.Equal("Nico, mensaje de crisis.", mensaje.Texto);
        Assert.Empty(historial.Guardadas);
    }

    [Fact]
    public async Task Una_persona_que_no_existe_no_recibe_mensaje()
    {
        var comando = new GenerarMensajeApoyoComando(Guid.NewGuid(), Emocion.Rabia, "texto");

        await Assert.ThrowsAsync<AccesoDenegado>(() => generar.Ejecutar(comando, CancellationToken.None));
        Assert.Empty(generador.Recibidas);
    }

    [Fact]
    public void El_comando_y_el_resultado_no_se_imprimen()
    {
        var comando = new GenerarMensajeApoyoComando(usuarioId, Emocion.Tristeza, "texto privado");

        Assert.DoesNotContain("privado", comando.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("Nico", new MensajeDeApoyoGenerado("Hola, Nico.", false).ToString(), StringComparison.Ordinal);
    }
}
