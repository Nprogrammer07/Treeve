using Treeve.Application.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

public sealed record IniciarSesionComando(string? Identificador, string? Contrasena)
{
    // Lleva una contraseña: nunca se imprime.
    public override string ToString() => "[inicio de sesión]";
}

/// <summary>HU-03a: inicia sesión con usuario o correo + contraseña y bloquea la cuenta tras 5 intentos fallidos.</summary>
public sealed class IniciarSesion(
    IRepositorioCredenciales credenciales,
    IRepositorioUsuarios usuarios,
    IHasheadorDeContrasenas hasheador,
    IReloj reloj,
    AbridorDeSesiones abridorDeSesiones)
{
    public async Task<SesionIniciada> Ejecutar(IniciarSesionComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        var contrasena = comando.Contrasena ?? string.Empty;

        // Ninguna contraseña válida supera este largo: se descarta sin gastar tiempo de CPU en hashearla.
        if (contrasena.Length > PoliticaDeContrasena.LongitudMaxima)
        {
            throw new CredencialesInvalidas();
        }

        var credencial = await credenciales.ObtenerPorIdentificador(Usuario.NormalizarIdentificador(comando.Identificador), ct);

        if (credencial is null)
        {
            // Mismo trabajo y misma respuesta que con una contraseña incorrecta: no se revela qué usuarios existen.
            hasheador.Verificar(null, contrasena);
            throw new CredencialesInvalidas();
        }

        var ahora = reloj.Ahora;
        if (credencial.EstaBloqueada(ahora))
        {
            throw new CuentaBloqueada(credencial.TiempoDeBloqueoRestante(ahora));
        }

        if (!hasheador.Verificar(credencial.HashDeContrasena, contrasena))
        {
            credencial.RegistrarIntentoFallido(ahora);
            await credenciales.Actualizar(credencial, ct);
            throw new CredencialesInvalidas();
        }

        credencial.RegistrarAccesoExitoso(ahora);
        await credenciales.Actualizar(credencial, ct);

        // El perfil solo se lee con la contraseña verificada: lo necesita la sesión (apodo).
        var usuario = await usuarios.ObtenerPorId(credencial.UsuarioId, ct)
            ?? throw new CredencialesInvalidas();

        return await abridorDeSesiones.Abrir(usuario, ct);
    }
}
