using System.Text.RegularExpressions;
using Treeve.Domain.Comun;

namespace Treeve.Domain.Identidad;

/// <summary>Reglas de los datos de registro (HU-02). Cada método valida y devuelve el valor normalizado.</summary>
public static partial class ReglasDeIdentidad
{
    public const int NombreCompletoMaximo = 100;
    public const int ApodoMaximo = 30;
    public const int NombreDeUsuarioMinimo = 3;
    public const int NombreDeUsuarioMaximo = 30;
    public const int CorreoMaximo = 254;
    public const int MotivoMaximo = 500;

    public static string NombreCompleto(string? texto) =>
        TextoObligatorio(texto, "El nombre completo", 2, NombreCompletoMaximo);

    public static string Apodo(string? texto) =>
        TextoObligatorio(texto, "El apodo", 2, ApodoMaximo);

    /// <summary>El usuario se guarda en minúsculas, así "Ana" y "ana" son el mismo usuario.</summary>
    public static string NombreDeUsuario(string? texto)
    {
        var valor = Normalizar(texto);
        if (valor.Length is < NombreDeUsuarioMinimo or > NombreDeUsuarioMaximo || !FormatoDeUsuario().IsMatch(valor))
        {
            throw new ExcepcionDeDominio(
                $"El usuario debe tener entre {NombreDeUsuarioMinimo} y {NombreDeUsuarioMaximo} caracteres: letras, números, punto, guion o guion bajo.");
        }

        return valor;
    }

    /// <summary>El correo es opcional: un texto vacío devuelve null.</summary>
    public static string? Correo(string? texto)
    {
        var valor = Normalizar(texto);
        if (valor.Length == 0)
        {
            return null;
        }

        if (valor.Length > CorreoMaximo || !FormatoDeCorreo().IsMatch(valor))
        {
            throw new ExcepcionDeDominio("El correo no tiene un formato válido.");
        }

        return valor;
    }

    /// <summary>"¿Por qué decidiste instalarte Treeve?": texto libre y opcional.</summary>
    public static string? Motivo(string? texto)
    {
        var valor = (texto ?? string.Empty).Trim();
        if (valor.Length == 0)
        {
            return null;
        }

        if (valor.Length > MotivoMaximo)
        {
            throw new ExcepcionDeDominio($"El motivo no puede superar los {MotivoMaximo} caracteres.");
        }

        return valor;
    }

    public static string Normalizar(string? texto) => (texto ?? string.Empty).Trim().ToLowerInvariant();

    private static string TextoObligatorio(string? texto, string campo, int minimo, int maximo)
    {
        var valor = (texto ?? string.Empty).Trim();
        if (valor.Length < minimo || valor.Length > maximo)
        {
            throw new ExcepcionDeDominio($"{campo} debe tener entre {minimo} y {maximo} caracteres.");
        }

        return valor;
    }

    [GeneratedRegex("^[a-z0-9._-]+$")]
    private static partial Regex FormatoDeUsuario();

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex FormatoDeCorreo();
}
