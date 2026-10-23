using Treeve.Application.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.MensajesApoyo;
using Treeve.Domain.Services.Identidad;
using Treeve.Domain.Services.MensajesApoyo;

namespace Treeve.Application.MensajesApoyo;

public sealed record GenerarMensajeApoyoComando(Guid UsuarioId, Emocion Emocion, string Texto)
{
    // Lleva el texto del desahogo: nunca se imprime.
    public override string ToString() => "[generar mensaje de apoyo]";
}

/// <param name="EsDeCrisis">Para que la interfaz muestre la línea de atención como sugerencia. No se guarda.</param>
public sealed record MensajeDeApoyoGenerado(string Texto, bool EsDeCrisis)
{
    public override string ToString() => "[mensaje de apoyo]";
}

/// <summary>
/// HU-06a-1: arma el mensaje de apoyo de un desahogo. Lo llama el guardado del desahogo (HU-05) en la misma
/// petición, no por evento, para cumplir los 2 s (ADR-001). El texto solo se usa en memoria.
/// </summary>
public sealed class GenerarMensajeApoyo(
    IGeneradorMensajeApoyo generador,
    IHistorialRespuestas historial,
    IRepositorioUsuarios usuarios,
    ICifradorDeDatosSensibles cifrador,
    IGeneradorDeSemillas semillas,
    IReloj reloj)
{
    private const char Separador = ',';

    /// <summary>Contexto de cifrado de los fragmentos usados: los ata a su persona y a su respuesta.</summary>
    public static string ContextoDelHistorial(Guid usuarioId, Guid respuestaId) =>
        $"historial_respuestas.fragmentos:{usuarioId}:{respuestaId}";

    public async Task<MensajeDeApoyoGenerado> Ejecutar(GenerarMensajeApoyoComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        // El apodo sale de la base de datos, no de la petición.
        var usuario = await usuarios.ObtenerPorId(comando.UsuarioId, ct) ?? throw new AccesoDenegado();
        var recientes = await FragmentosRecientes(comando.UsuarioId, ct);

        var mensaje = generador.Generar(
            new PeticionDeMensaje(usuario.Apodo, comando.Emocion, comando.Texto, recientes, semillas.Nueva()));

        // En crisis no se guarda nada, ni siquiera que la hubo: sería un dato de salud.
        if (!mensaje.EsDeCrisis)
        {
            var id = Guid.NewGuid();
            var cifrados = cifrador.Cifrar(
                string.Join(Separador, mensaje.FragmentosUsados), ContextoDelHistorial(comando.UsuarioId, id));

            await historial.Registrar(
                RespuestaRegistrada.Crear(id, comando.UsuarioId, cifrados, reloj.Ahora), MotorDeRespuesta.RespuestasSinRepetir, ct);
        }

        return new MensajeDeApoyoGenerado(mensaje.Texto, mensaje.EsDeCrisis);
    }

    private async Task<IReadOnlyList<string>> FragmentosRecientes(Guid usuarioId, CancellationToken ct)
    {
        var respuestas = await historial.ObtenerRecientes(usuarioId, MotorDeRespuesta.RespuestasSinRepetir, ct);

        return respuestas
            .SelectMany(r => cifrador.Descifrar(r.FragmentosCifrados, ContextoDelHistorial(usuarioId, r.Id)).Split(Separador))
            .ToList();
    }
}
