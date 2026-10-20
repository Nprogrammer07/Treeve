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
    IReloj reloj,
    AbridorDeSesiones abridorDeSesiones)
{
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

        var usuario = Usuario.Registrar(datos, hasheador.Hashear(contrasena), reloj.Ahora);
        await usuarios.Agregar(usuario, ct);

        // Criterio de HU-02: al registrarse, el usuario accede automáticamente.
        return await abridorDeSesiones.Abrir(usuario, ct);
    }
}
