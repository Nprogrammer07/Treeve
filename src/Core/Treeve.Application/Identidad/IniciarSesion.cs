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

        var usuario = await usuarios.ObtenerPorIdentificador(Usuario.NormalizarIdentificador(comando.Identificador), ct);

        if (usuario is null)
        {
            // Mismo trabajo y misma respuesta que con una contraseña incorrecta: no se revela qué usuarios existen.
            hasheador.Verificar(null, contrasena);
            throw new CredencialesInvalidas();
        }

        var ahora = reloj.Ahora;
        if (usuario.EstaBloqueado(ahora))
        {
            throw new CuentaBloqueada(usuario.TiempoDeBloqueoRestante(ahora));
        }

        if (!hasheador.Verificar(usuario.HashDeContrasena, contrasena))
        {
            usuario.RegistrarIntentoFallido(ahora);
            await usuarios.Actualizar(usuario, ct);
            throw new CredencialesInvalidas();
        }

        usuario.RegistrarAccesoExitoso();
        await usuarios.Actualizar(usuario, ct);

        return await abridorDeSesiones.Abrir(usuario, ct);
    }
}
