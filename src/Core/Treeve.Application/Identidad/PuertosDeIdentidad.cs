namespace Treeve.Application.Identidad;

/// <summary>Hash con sal de las contraseñas (RNF de seguridad de HU-02). Se implementa en Infrastructure.</summary>
public interface IHasheadorDeContrasenas
{
    string Hashear(string contrasena);

    /// <summary>
    /// Compara la contraseña con el hash guardado. Si <paramref name="hash"/> es null (el usuario no existe)
    /// tarda lo mismo y devuelve false, para no revelar qué usuarios existen.
    /// </summary>
    bool Verificar(string? hash, string contrasena);
}

public sealed record TokenDeSesion(string Valor, string Hash)
{
    // El token en claro equivale a una contraseña: no se imprime.
    public override string ToString() => "[token de sesión]";
}

/// <summary>
/// HU-03b: avisa a la persona, por correo, cómo restablecer su contraseña. Quien implementa arma el enlace (con la
/// dirección del frontend) y el texto del correo; el núcleo solo entrega el token en claro, una vez. Si el correo no
/// sale, lanza <see cref="ErrorDeEnvioDeCorreo"/>.
/// </summary>
public interface INotificadorDeRecuperacion
{
    Task Enviar(string correo, string apodo, string token, DateTimeOffset expiraEn, CancellationToken ct);
}

public interface IEmisorDeTokens
{
    /// <summary>Genera un token aleatorio y su hash. Solo el hash se guarda.</summary>
    TokenDeSesion Emitir();

    string HashDe(string tokenEnClaro);
}
