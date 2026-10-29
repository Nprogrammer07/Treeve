using Treeve.Application.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Identidad;

namespace Treeve.Application.Administracion;

/// <summary>
/// HU-12: un administrador le quita el rol de staff a una persona, que vuelve a ser usuario regular. Vale desde su
/// siguiente petición, porque el rol se lee de la base de datos en cada una (HU-10).
/// </summary>
public sealed class RevocarStaff(AutorizarAcceso autorizar, IRepositorioUsuarios usuarios, RegistradorDeCambiosDeRol registrador)
{
    public async Task<CambioDeRolAplicado> Ejecutar(Guid administradorId, ContextoDeAcceso contexto, Guid usuarioId, CancellationToken ct)
    {
        await autorizar.Ejecutar(administradorId, Rol.Administrador, contexto, ct);

        var usuario = await usuarios.ObtenerPorId(usuarioId, ct)
            ?? throw new ExcepcionDeDominio("Esta persona no es parte del staff.");

        var anterior = usuario.RevocarStaff();

        return await registrador.Registrar(administradorId, usuario, anterior, ct);
    }
}
