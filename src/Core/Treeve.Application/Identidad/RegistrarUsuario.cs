using Treeve.Application.Comun;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Identidad;

public sealed record RegistrarUsuarioComando(
    string? NombreCompleto,
    string? Apodo,
    string? NombreDeUsuario,
    string? Contrasena,
    string? Correo,
    string? MotivoDeRegistro)
{
    // Los records imprimen todas sus propiedades; aquí no se imprime nada (hay una contraseña).
    public override string ToString() => "[registro de usuario]";
}

/// <summary>HU-02: registra a un visitante con los datos mínimos y lo deja con la sesión abierta.</summary>
public sealed class RegistrarUsuario(
    IRepositorioUsuarios usuarios,
    IHasheadorDeContrasenas hasheador,
    ICifradorDeDatosSensibles cifrador,
    IReloj reloj,
    AbridorDeSesiones abridorDeSesiones)
{
    /// <summary>Contexto de cifrado del motivo: lo ata a su columna y a su usuario.</summary>
    public static string ContextoDelMotivo(Guid usuarioId) => $"usuarios.motivo_de_registro:{usuarioId}";

    public async Task<SesionIniciada> Ejecutar(RegistrarUsuarioComando comando, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(comando);

        // Primero lo barato (validaciones y duplicados); el hash es costoso a propósito.
        var datos = DatosDeRegistro.Crear(
            comando.NombreCompleto, comando.Apodo, comando.NombreDeUsuario, comando.Correo, comando.MotivoDeRegistro);
        var contrasena = PoliticaDeContrasena.Validar(comando.Contrasena);

        if (await usuarios.ExisteNombreDeUsuarioOCorreo(datos.NombreDeUsuario, datos.Correo, ct))
        {
            throw new ExcepcionDeDominio("El usuario o el correo ya están en uso.");
        }

        var ahora = reloj.Ahora;
        var id = Guid.NewGuid();
        var motivoCifrado = datos.MotivoDeRegistro is { } motivo ? cifrador.Cifrar(motivo, ContextoDelMotivo(id)) : null;

        var usuario = Usuario.Registrar(id, datos, motivoCifrado, ahora);
        var credencial = Credencial.Crear(id, hasheador.Hashear(contrasena), ahora);
        await usuarios.Agregar(usuario, credencial, ct);

        // Criterio de HU-02: al registrarse, el usuario accede automáticamente.
        return await abridorDeSesiones.Abrir(usuario, ct);
    }
}
