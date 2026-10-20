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
