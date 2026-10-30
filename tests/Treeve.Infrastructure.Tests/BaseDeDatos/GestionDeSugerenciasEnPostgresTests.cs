using Microsoft.EntityFrameworkCore;
using Treeve.Domain.Identidad;
using Treeve.Domain.Services.Sugerencias;
using Treeve.Domain.Sugerencias;
using Treeve.Infrastructure.Persistence.Identidad;
using Treeve.Infrastructure.Persistence.Sugerencias;

namespace Treeve.Infrastructure.Tests.BaseDeDatos;

/// <summary>
/// HU-11 contra PostgreSQL real: la gestión del staff se guarda y se lee de vuelta (también en el historial de quien
/// sugirió), la base de datos ordena el listado y borrar la cuenta de quien gestionó no borra la respuesta.
/// </summary>
public sealed class GestionDeSugerenciasEnPostgresTests(PostgresDePruebas db) : IClassFixture<PostgresDePruebas>
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 30, 12, 0, 0, TimeSpan.Zero);

    private async Task<Usuario> RegistrarPersona(Rol rol, string? nombre = null)
    {
        var datos = DatosDeRegistro.Crear("Persona de Prueba", "Pru", nombre ?? $"p{Guid.NewGuid():N}"[..20], null, null);
        var persona = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);
        persona.CambiarRol(rol);

        await using var contexto = db.NuevoContexto();
        await new RepositorioUsuariosPostgres(contexto).Agregar(persona, Credencial.Crear(persona.Id, "hash", Ahora), CancellationToken.None);
        return persona;
    }

    private async Task<Sugerencia> Enviar(Guid usuarioId, string texto, DateTimeOffset enviadaEn)
    {
        var sugerencia = Sugerencia.Enviar(usuarioId, TextoSugerencia.Crear(texto), enviadaEn);

        await using var contexto = db.NuevoContexto();
        await new RepositorioSugerenciasPostgres(contexto).Agregar(sugerencia, CancellationToken.None);
        return sugerencia;
    }

    private async Task Gestionar(Guid sugerenciaId, Guid staffId, EstadoSugerencia estado, string comentario)
    {
        await using var contexto = db.NuevoContexto();
        var repositorio = new RepositorioSugerenciasPostgres(contexto);
        var cargada = (await repositorio.ObtenerPorId(sugerenciaId, CancellationToken.None))!;

        Assert.NotNull(cargada.Gestionar(staffId, estado, ComentarioDelStaff.Crear(comentario), Ahora));
        await repositorio.Guardar(cargada, CancellationToken.None);
    }

    [FactConPostgres]
    public async Task El_estado_y_el_comentario_quedan_guardados_y_los_ve_quien_sugirio()
    {
        var autora = await RegistrarPersona(Rol.Usuario);
        var staff = await RegistrarPersona(Rol.Staff);
        var sugerencia = await Enviar(autora.Id, "Modo oscuro", Ahora.AddDays(-1));

        await Gestionar(sugerencia.Id, staff.Id, EstadoSugerencia.Implementada, "Ya está disponible en los ajustes.");

        await using var contexto = db.NuevoContexto();
        var propia = Assert.Single(await new RepositorioSugerenciasPostgres(contexto).ListarDeUsuario(autora.Id, 10, CancellationToken.None));
        Assert.Equal(EstadoSugerencia.Implementada, propia.Estado);
        Assert.Equal("Ya está disponible en los ajustes.", propia.Comentario);
        Assert.Equal(staff.Id, propia.GestionadaPor);
        Assert.Equal(Ahora, propia.GestionadaEn);

        var deStaff = Assert.Single(await new RepositorioSugerenciasPostgres(contexto).Buscar(
            new FiltroDeSugerencias(null, null, null, autora.NombreDeUsuario, 10, 0), CancellationToken.None));
        Assert.Equal("Ya está disponible en los ajustes.", deStaff.Comentario);
        Assert.Equal(Ahora, deStaff.GestionadaEn);
    }

    [FactConPostgres]
    public async Task La_base_de_datos_ordena_por_fecha_en_los_dos_sentidos_y_por_usuario()
    {
        var sufijo = Guid.NewGuid().ToString("N")[..8];
        var beto = await RegistrarPersona(Rol.Usuario, $"beto{sufijo}");
        var ana = await RegistrarPersona(Rol.Usuario, $"ana{sufijo}");
        var desde = Ahora.AddYears(-1); // franja propia de esta prueba: no se mezcla con las demás
        await Enviar(beto.Id, "Primera", desde.AddMinutes(1));
        await Enviar(ana.Id, "Segunda", desde.AddMinutes(2));
        await Enviar(beto.Id, "Tercera", desde.AddMinutes(3));

        async Task<string[]> Textos(OrdenDeSugerencias orden)
        {
            await using var contexto = db.NuevoContexto();
            var filas = await new RepositorioSugerenciasPostgres(contexto).Buscar(
                new FiltroDeSugerencias(null, desde, desde.AddHours(1), null, 10, 0, orden), CancellationToken.None);
            return [.. filas.Select(f => f.Texto)];
        }

        Assert.Equal(["Tercera", "Segunda", "Primera"], await Textos(OrdenDeSugerencias.Recientes));
        Assert.Equal(["Primera", "Segunda", "Tercera"], await Textos(OrdenDeSugerencias.Antiguas));
        Assert.Equal(["Segunda", "Tercera", "Primera"], await Textos(OrdenDeSugerencias.Usuario)); // ana, luego beto (reciente primero)
    }

    [FactConPostgres]
    public async Task Si_se_elimina_la_cuenta_de_quien_gestiono_la_respuesta_se_conserva()
    {
        var autora = await RegistrarPersona(Rol.Usuario);
        var staff = await RegistrarPersona(Rol.Staff);
        var sugerencia = await Enviar(autora.Id, "Más sonidos", Ahora.AddDays(-2));
        await Gestionar(sugerencia.Id, staff.Id, EstadoSugerencia.EnRevision, "Lo estamos evaluando.");

        await using var contexto = db.NuevoContexto();
        await contexto.Set<Usuario>().Where(u => u.Id == staff.Id).ExecuteDeleteAsync();

        var conservada = (await new RepositorioSugerenciasPostgres(contexto).ObtenerPorId(sugerencia.Id, CancellationToken.None))!;
        Assert.Null(conservada.GestionadaPor);
        Assert.Equal("Lo estamos evaluando.", conservada.Comentario);
        Assert.Equal(EstadoSugerencia.EnRevision, conservada.Estado);
    }
}
