using Treeve.Application.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Administracion;

/// <summary>
/// HU-12: un administrador suma al staff a una persona registrada, buscándola por su nombre de usuario. Solo un
/// administrador puede hacerlo, y se valida aquí en cada llamada (no basta con la ruta).
/// </summary>
public sealed class AscenderAStaff(AutorizarAcceso autorizar, IRepositorioUsuarios usuarios, RegistradorDeCambiosDeRol registrador)
{
    public async Task<CambioDeRolAplicado> Ejecutar(Guid administradorId, ContextoDeAcceso contexto, string? nombreDeUsuario, CancellationToken ct)
    {
        await autorizar.Ejecutar(administradorId, Rol.Administrador, contexto, ct);

        var nombre = Usuario.NormalizarIdentificador(nombreDeUsuario);
        var usuario = (nombre.Length == 0 ? null : await usuarios.ObtenerPorNombreDeUsuario(nombre, ct))
            ?? throw new ExcepcionDeDominio("No hay ninguna persona registrada con ese usuario.");

        var anterior = usuario.AscenderAStaff();

        return await registrador.Registrar(administradorId, usuario, anterior, ct);
    }
}
