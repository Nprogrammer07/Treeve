namespace Treeve.Domain.Identidad;

/// <summary>
/// Rol de una persona en la plataforma (HU-10). Todo el mundo nace como <see cref="Usuario"/>; el staff y la
/// administración se asignan después (HU-12). El orden importa: cada rol puede lo que puede el anterior.
/// </summary>
public enum Rol
{
    Usuario = 0,
    Staff = 1,
    Administrador = 2,
}

public static class PermisosDeRol
{
    /// <summary>
    /// Indica si este rol alcanza el nivel que pide la ruta. Staff entra donde se pide staff; la administración
    /// entra a todo; un usuario regular solo a lo suyo.
    /// </summary>
    public static bool Cumple(this Rol rol, Rol requerido) =>
        Enum.IsDefined(rol) && Enum.IsDefined(requerido) && rol >= requerido;
}
