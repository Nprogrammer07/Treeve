using Microsoft.EntityFrameworkCore;
using Npgsql;
using Treeve.Domain.Administracion;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Infrastructure.Persistence.Administracion;
using Treeve.Infrastructure.Persistence.Identidad;

namespace Treeve.Infrastructure.Tests.BaseDeDatos;

/// <summary>
/// HU-12 contra PostgreSQL real: lo que solo la base garantiza. Los logs son inmutables (triggers de ADR-006) y dos
/// administradores que cambian a la misma persona a la vez no duplican el cambio (token de concurrencia).
/// </summary>
public sealed class GestionDeStaffEnPostgresTests(PostgresDePruebas db) : IClassFixture<PostgresDePruebas>
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);

    private async Task<Usuario> RegistrarPersona(Rol rol)
    {
        var datos = DatosDeRegistro.Crear("Persona de Prueba", "Pru", $"p{Guid.NewGuid():N}"[..20], null, null);
        var persona = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);
        persona.CambiarRol(rol);

        await using var contexto = db.NuevoContexto();
        await new RepositorioUsuariosPostgres(contexto).Agregar(persona, Credencial.Crear(persona.Id, "hash", Ahora), CancellationToken.None);
        return persona;
    }

    /// <summary>Deja al menos una fila real en cada log, escrita por los repositorios de la aplicación.</summary>
    private async Task LlenarLosLogs()
    {
        var administrador = await RegistrarPersona(Rol.Administrador);
        var persona = await RegistrarPersona(Rol.Usuario);

        await using var contexto = db.NuevoContexto();
        var cargada = (await new RepositorioUsuariosPostgres(contexto).ObtenerPorId(persona.Id, CancellationToken.None))!;
        var anterior = cargada.AscenderAStaff();
        await new RepositorioCambiosDeRolPostgres(contexto).Registrar(
            CambioDeRol.Registrar(administrador.Id, persona.Id, anterior, cargada.Rol, Ahora), cargada, CancellationToken.None);
        await new RepositorioAuditoriaPostgres(contexto).Registrar(
            AccesoNoAutorizado.Registrar(persona.Id, "203.0.113.7", "GET /api/admin/staff", Rol.Administrador, Ahora), CancellationToken.None);
    }

    [TheoryConPostgres]
    [InlineData("UPDATE treeve.auditoria_roles SET ocurrio_en = now()")]
    [InlineData("DELETE FROM treeve.auditoria_roles")]
    [InlineData("TRUNCATE treeve.auditoria_roles")]
    [InlineData("UPDATE treeve.auditoria_accesos SET ip = 'otra'")]
    [InlineData("DELETE FROM treeve.auditoria_accesos")]
    [InlineData("TRUNCATE treeve.auditoria_accesos")]
    public async Task Los_logs_de_auditoria_rechazan_cualquier_cambio_o_borrado(string sql)
    {
        await LlenarLosLogs();
        await using var contexto = db.NuevoContexto();
        var antes = (await contexto.Set<CambioDeRol>().CountAsync(), await contexto.Set<AccesoNoAutorizado>().CountAsync());

        var error = await Assert.ThrowsAsync<PostgresException>(() => contexto.Database.ExecuteSqlRawAsync(sql));

        Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, error.SqlState);
        Assert.Equal(antes, (await contexto.Set<CambioDeRol>().CountAsync(), await contexto.Set<AccesoNoAutorizado>().CountAsync()));
    }

    [FactConPostgres]
    public async Task Los_logs_siguen_aceptando_filas_nuevas()
    {
        await LlenarLosLogs();
        await using var contexto = db.NuevoContexto();
        var antes = await contexto.Set<AccesoNoAutorizado>().CountAsync();

        await LlenarLosLogs();

        Assert.Equal(antes + 1, await contexto.Set<AccesoNoAutorizado>().CountAsync());
    }

    [FactConPostgres]
    public async Task Si_dos_administradores_ascienden_a_la_misma_persona_a_la_vez_solo_vale_el_primero()
    {
        var primera = await RegistrarPersona(Rol.Administrador);
        var segunda = await RegistrarPersona(Rol.Administrador);
        var persona = await RegistrarPersona(Rol.Usuario);

        // Dos peticiones simultáneas: cada una lee a la persona cuando todavía es usuario regular.
        await using var peticionA = db.NuevoContexto();
        await using var peticionB = db.NuevoContexto();
        var enA = (await new RepositorioUsuariosPostgres(peticionA).ObtenerPorId(persona.Id, CancellationToken.None))!;
        var enB = (await new RepositorioUsuariosPostgres(peticionB).ObtenerPorId(persona.Id, CancellationToken.None))!;
        var anteriorA = enA.AscenderAStaff();
        var anteriorB = enB.AscenderAStaff();

        await new RepositorioCambiosDeRolPostgres(peticionA).Registrar(
            CambioDeRol.Registrar(primera.Id, persona.Id, anteriorA, enA.Rol, Ahora), enA, CancellationToken.None);
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => new RepositorioCambiosDeRolPostgres(peticionB).Registrar(
            CambioDeRol.Registrar(segunda.Id, persona.Id, anteriorB, enB.Rol, Ahora), enB, CancellationToken.None));

        await using var despues = db.NuevoContexto();
        Assert.Equal(1, await despues.Set<CambioDeRol>().CountAsync(c => c.UsuarioAfectadoId == persona.Id));
        Assert.Equal(Rol.Staff, (await despues.Set<Usuario>().SingleAsync(u => u.Id == persona.Id)).Rol);
    }

    [FactConPostgres]
    public async Task El_listado_de_staff_solo_trae_staff_y_administracion()
    {
        var staff = await RegistrarPersona(Rol.Staff);
        var regular = await RegistrarPersona(Rol.Usuario);

        await using var contexto = db.NuevoContexto();
        var listado = await new RepositorioUsuariosPostgres(contexto).ListarStaff(CancellationToken.None);

        Assert.Contains(listado, p => p.UsuarioId == staff.Id && p.Rol == Rol.Staff);
        Assert.DoesNotContain(listado, p => p.UsuarioId == regular.Id);
    }
}
