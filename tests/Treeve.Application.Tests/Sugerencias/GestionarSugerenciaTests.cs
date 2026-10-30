using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Application.Notificaciones;
using Treeve.Application.Sugerencias;
using Treeve.Application.Tests.Administracion;
using Treeve.Application.Tests.Desahogos;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;
using Treeve.Domain.Notificaciones;
using Treeve.Domain.Sugerencias;

namespace Treeve.Application.Tests.Sugerencias;

public class GestionarSugerenciaTests
{
    private static readonly DateTimeOffset Inicio = new(2026, 10, 30, 10, 0, 0, TimeSpan.FromHours(-5));

    private static readonly ContextoDeAcceso Contexto = new("203.0.113.7", "PATCH /api/staff/sugerencias/{sugerenciaId}");

    private readonly RepositorioSugerenciasFalso sugerencias = new();
    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioAuditoriaFalso auditoria = new();
    private readonly PublicadorEventosFalso eventos = new();
    private readonly RelojManual reloj = new(Inicio);
    private readonly GestionarSugerencia gestionar;
    private readonly Guid autora;
    private readonly Sugerencia sugerencia;

    public GestionarSugerenciaTests()
    {
        gestionar = new GestionarSugerencia(new AutorizarAcceso(usuarios, auditoria, reloj), sugerencias, eventos, reloj);
        autora = RegistrarPersona(Rol.Usuario).Id;
        sugerencia = Sugerencia.Enviar(autora, TextoSugerencia.Crear("Modo oscuro"), Inicio.AddDays(-3));
        sugerencias.Guardadas.Add(sugerencia);
    }

    private Usuario RegistrarPersona(Rol rol)
    {
        var datos = DatosDeRegistro.Crear("Persona de Prueba", "Pru", $"pru{usuarios.Guardados.Count}", null, null);
        var persona = Usuario.Registrar(Guid.NewGuid(), datos, null, Inicio);
        persona.CambiarRol(rol);
        usuarios.Guardados.Add(persona);
        return persona;
    }

    private Task<SugerenciaGestionadaResultado> Gestionar(Guid quien, EstadoSugerencia? estado, string? comentario, Guid? sugerenciaId = null) =>
        gestionar.Ejecutar(quien, Contexto, new GestionarSugerenciaComando(sugerenciaId ?? sugerencia.Id, estado, comentario), CancellationToken.None);

    [Theory]
    [InlineData(Rol.Staff)]
    [InlineData(Rol.Administrador)]
    public async Task El_staff_y_la_administracion_cambian_el_estado_y_comentan(Rol rol)
    {
        var staff = RegistrarPersona(rol).Id;

        var resultado = await Gestionar(staff, EstadoSugerencia.Implementada, "Ya está disponible.");

        Assert.True(resultado.HuboCambios);
        Assert.Equal(EstadoSugerencia.Implementada, resultado.Estado);
        Assert.Equal("Ya está disponible.", resultado.Comentario);
        Assert.Equal(Inicio, resultado.GestionadaEn);
        Assert.Equal(1, sugerencias.VecesGuardada);
        Assert.Equal(staff, sugerencia.GestionadaPor);
    }

    [Fact]
    public async Task Publica_el_evento_para_avisar_a_quien_sugirio_sin_texto()
    {
        var staff = RegistrarPersona(Rol.Staff).Id;

        await Gestionar(staff, EstadoSugerencia.EnRevision, "Lo vamos a evaluar.");

        var evento = Assert.IsType<SugerenciaGestionada>(Assert.Single(eventos.Publicados));
        Assert.Equal(autora, evento.UsuarioId);
        Assert.Equal(sugerencia.Id, evento.SugerenciaId);
        Assert.True(evento.CambioElEstado);
        Assert.True(evento.CambioElComentario);
    }

    [Fact]
    public async Task Una_persona_sin_rol_de_staff_no_puede_y_queda_en_la_auditoria()
    {
        var usuaria = RegistrarPersona(Rol.Usuario).Id;

        await Assert.ThrowsAsync<AccesoDenegado>(() => Gestionar(usuaria, EstadoSugerencia.Rechazada, "No"));

        Assert.Equal(EstadoSugerencia.Pendiente, sugerencia.Estado);
        Assert.Null(sugerencia.Comentario);
        Assert.Equal(0, sugerencias.VecesGuardada);
        Assert.Empty(eventos.Publicados);
        Assert.Single(auditoria.Registrados);
    }

    [Fact]
    public async Task Quien_no_es_staff_no_sabe_si_la_sugerencia_existe()
    {
        var usuaria = RegistrarPersona(Rol.Usuario).Id;

        // Mismo error con una sugerencia que no existe: la autorización va antes que la búsqueda.
        await Assert.ThrowsAsync<AccesoDenegado>(() => Gestionar(usuaria, EstadoSugerencia.Rechazada, null, Guid.NewGuid()));
    }

    [Fact]
    public async Task Una_sugerencia_que_no_existe_da_error_de_validacion()
    {
        var staff = RegistrarPersona(Rol.Staff).Id;

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Gestionar(staff, EstadoSugerencia.EnRevision, null, Guid.NewGuid()));
        Assert.Empty(eventos.Publicados);
    }

    [Fact]
    public async Task Enviar_lo_mismo_que_ya_tenia_no_guarda_ni_avisa()
    {
        var staff = RegistrarPersona(Rol.Staff).Id;
        await Gestionar(staff, EstadoSugerencia.EnRevision, "Lo vamos a evaluar.");
        reloj.Avanzar(TimeSpan.FromHours(1));

        var resultado = await Gestionar(staff, EstadoSugerencia.EnRevision, "Lo vamos a evaluar.");

        Assert.False(resultado.HuboCambios);
        Assert.Equal(Inicio, resultado.GestionadaEn);
        Assert.Equal(1, sugerencias.VecesGuardada);
        Assert.Single(eventos.Publicados);
    }

    [Fact]
    public async Task Sin_estado_ni_comentario_da_error_de_validacion()
    {
        var staff = RegistrarPersona(Rol.Staff).Id;

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Gestionar(staff, null, null));
    }

    [Fact]
    public async Task Un_comentario_demasiado_largo_no_se_guarda()
    {
        var staff = RegistrarPersona(Rol.Staff).Id;

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() =>
            Gestionar(staff, EstadoSugerencia.EnRevision, new string('a', ComentarioDelStaff.LongitudMaxima + 1)));

        Assert.Equal(EstadoSugerencia.Pendiente, sugerencia.Estado);
        Assert.Equal(0, sugerencias.VecesGuardada);
    }

    [Fact]
    public async Task Quien_sugirio_ve_el_comentario_en_su_historial_pero_no_quien_respondio()
    {
        var staff = RegistrarPersona(Rol.Staff).Id;
        await Gestionar(staff, EstadoSugerencia.Rechazada, "Ya existe en los ajustes.");

        var propia = Assert.Single(await new ListarMisSugerencias(sugerencias).Ejecutar(autora, CancellationToken.None));

        Assert.Equal(EstadoSugerencia.Rechazada, propia.Estado);
        Assert.Equal("Ya existe en los ajustes.", propia.Comentario);
        Assert.Equal(Inicio, propia.RespondidaEn);
        Assert.DoesNotContain(typeof(SugerenciaPropia).GetProperties(), p => p.Name.Contains("Por", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Quien_sugirio_recibe_un_aviso_una_sola_vez_aunque_el_evento_se_repita()
    {
        var notificaciones = new RepositorioNotificacionesFalso();
        var alGestionar = new AlGestionarSugerencia(notificaciones);
        var staff = RegistrarPersona(Rol.Staff).Id;
        await Gestionar(staff, EstadoSugerencia.Implementada, null);
        var evento = (SugerenciaGestionada)eventos.Publicados[0];

        await alGestionar.Manejar(evento, CancellationToken.None);
        await alGestionar.Manejar(evento, CancellationToken.None);

        var aviso = Assert.Single(notificaciones.Guardadas);
        Assert.Equal(autora, aviso.UsuarioId);
        Assert.Equal(TipoDeNotificacion.SugerenciaRespondida, aviso.Tipo);
    }
}
