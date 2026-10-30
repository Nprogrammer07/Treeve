using Treeve.Application.Comun;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

public sealed record SolicitarRecuperacionComando(string? Correo)
{
    // Lleva un correo: no se imprime.
    public override string ToString() => "[solicitud de recuperación]";
}

/// <summary>
/// HU-03b: la persona pide un enlace para restablecer su contraseña y lo recibe en el correo con el que se registró.
///
/// Criterio de aceptación: el mensaje no revela si un correo está registrado. Por eso este caso de uso termina igual
/// (sin error) cuando el correo no existe, cuando la persona pidió otro enlace hace poco y cuando el correo no pudo
/// salir; la API siempre responde lo mismo. Lo único que se rechaza es un texto que no parece un correo.
/// </summary>
public sealed class SolicitarRecuperacion(
    IRepositorioUsuarios usuarios,
    IRepositorioRecuperaciones recuperaciones,
    IEmisorDeTokens tokens,
    INotificadorDeRecuperacion notificador,
    IReloj reloj)
{
    public async Task Ejecutar(SolicitarRecuperacionComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        var correo = ReglasDeIdentidad.Correo(comando.Correo)
            ?? throw new ExcepcionDeDominio("Escribe el correo con el que te registraste.");

        var usuario = await usuarios.ObtenerPorCorreo(correo, ct);
        if (usuario is null)
        {
            return;
        }

        var ahora = reloj.Ahora;
        if (await recuperaciones.HayEmitidaDesde(usuario.Id, ahora - RecuperacionDeContrasena.EsperaEntreSolicitudes, ct))
        {
            return;
        }

        await recuperaciones.InvalidarPendientes(usuario.Id, ahora, ct);

        var token = tokens.Emitir();
        var recuperacion = RecuperacionDeContrasena.Emitir(usuario.Id, token.Hash, ahora);
        await recuperaciones.Agregar(recuperacion, ct);

        try
        {
            await notificador.Enviar(correo, usuario.Apodo, token.Valor, recuperacion.ExpiraEn, ct);
        }
        catch (ErrorDeEnvioDeCorreo)
        {
            // Quien implementa el envío ya dejó el motivo en el log. Aquí no se avisa a quien pregunta: distinguir
            // "no salió" de "salió" también diría que el correo está registrado.
        }
    }
}
