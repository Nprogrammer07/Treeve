using Treeve.Domain.Comun;

namespace Treeve.Domain.Identidad;

/// <summary>
/// Política mínima de contraseña (HU-02). Valores propuestos, por confirmar con el PO:
/// entre 8 y 128 caracteres, con al menos una letra y un número.
/// </summary>
public static class PoliticaDeContrasena
{
    public const int LongitudMinima = 8;
    public const int LongitudMaxima = 128;

    /// <summary>Devuelve la misma contraseña si cumple la política. Los mensajes nunca la incluyen.</summary>
    public static string Validar(string? contrasena)
    {
        if (contrasena is null || contrasena.Length < LongitudMinima)
        {
            throw new ExcepcionDeDominio($"La contraseña debe tener al menos {LongitudMinima} caracteres.");
        }

        if (contrasena.Length > LongitudMaxima)
        {
            throw new ExcepcionDeDominio($"La contraseña no puede superar los {LongitudMaxima} caracteres.");
        }

        if (!contrasena.Any(char.IsLetter) || !contrasena.Any(char.IsDigit))
        {
            throw new ExcepcionDeDominio("La contraseña debe incluir al menos una letra y un número.");
        }

        return contrasena;
    }
}
