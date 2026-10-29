using Treeve.Application.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

public sealed record RestablecerContrasenaComando(string? Token, string? NuevaContrasena)
{
    // Lleva el token del enlace y una contraseña: nunca se imprime.
    public override string ToString() => "[restablecer contraseña]";
}

/// <summary>
/// HU-03b: cambia la contraseña con el enlace recibido por correo. El enlace es de un solo uso y vence a los 30
/// minutos; al cambiar la contraseña se cierran todas las sesiones abiertas y se levanta el bloqueo de la cuenta.
/// </summary>
public sealed class RestablecerContrasena(
    IRepositorioRecuperaciones recuperaciones,
    IRepositorioCredenciales credenciales,
    IRepositorioSesiones sesiones,
    IHasheadorDeContrasenas hasheador,
    IEmisorDeTokens tokens,
    IReloj reloj)
{
    /// <summary>El token emitido mide 43 caracteres; se deja margen para espacios o cambios futuros.</summary>
    private const int TamanoMaximoDelToken = 200;

    public async Task Ejecutar(RestablecerContrasenaComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        // La contraseña se valida antes de gastar el enlace: una contraseña débil no debe quemarlo.
        var contrasena = PoliticaDeContrasena.Validar(comando.NuevaContrasena);

        // Un token con otro largo no puede ser uno emitido por nosotros; no hace falta consultar la base de datos.
        if (string.IsNullOrWhiteSpace(comando.Token) || comando.Token.Length > TamanoMaximoDelToken)
        {
            throw new TokenDeRecuperacionInvalido();
        }

        var ahora = reloj.Ahora;

        var usuarioId = await recuperaciones.Consumir(tokens.HashDe(comando.Token.Trim()), ahora, ct)
            ?? throw new TokenDeRecuperacionInvalido();

        var credencial = await credenciales.ObtenerPorUsuarioId(usuarioId, ct)
            ?? throw new TokenDeRecuperacionInvalido();

        // El hash es costoso a propósito: se calcula solo cuando el enlace resultó válido.
        credencial.CambiarContrasena(hasheador.Hashear(contrasena), ahora);
        await credenciales.Actualizar(credencial, ct);

        // Quien tuviera la contraseña vieja (o una sesión robada) pierde el acceso.
        await sesiones.RevocarDeUsuario(usuarioId, ct);
    }
}
