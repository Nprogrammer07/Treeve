namespace Treeve.Application.Identidad;

/// <summary>
/// Usuario o contraseña incorrectos. El mensaje es el mismo en ambos casos, a propósito: no dice qué dato falló.
/// </summary>
public sealed class CredencialesInvalidas() : Exception("Usuario o contraseña incorrectos.");

/// <summary>La cuenta está bloqueada temporalmente por demasiados intentos fallidos.</summary>
public sealed class CuentaBloqueada(TimeSpan restante) : Exception("Demasiados intentos fallidos. Intenta de nuevo más tarde.")
{
    public TimeSpan Restante { get; } = restante;
}

/// <summary>
/// El enlace de recuperación no existe, ya se usó o venció (HU-03b). Es el mismo mensaje en los tres casos: no
/// ayuda a quien adivina enlaces.
/// </summary>
public sealed class TokenDeRecuperacionInvalido() : Exception("El enlace no es válido o ya venció. Solicita uno nuevo.");

/// <summary>El correo no se pudo enviar (servicio caído, credenciales vencidas, sin configurar).</summary>
public sealed class ErrorDeEnvioDeCorreo(string mensaje, Exception? causa = null) : Exception(mensaje, causa);
