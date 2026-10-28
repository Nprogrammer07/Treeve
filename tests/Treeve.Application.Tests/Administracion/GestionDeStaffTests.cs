using Treeve.Application.Administracion;
using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Application.Tests.Desahogos;
using Treeve.Application.Tests.Identidad;
using Treeve.Domain.Administracion;
using Treeve.Domain.Comun;
using Treeve.Domain.Identidad;

namespace Treeve.Application.Tests.Administracion;

public class GestionDeStaffTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 27, 20, 0, 0, TimeSpan.FromHours(-5));
    private static readonly ContextoDeAcceso Contexto = new("203.0.113.7", "POST /api/admin/staff");

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioAuditoriaFalso auditoria = new();
    private readonly RepositorioCambiosDeRolFalso cambios = new();
    private readonly PublicadorEventosFalso eventos = new();
    private readonly RelojManual reloj = new(Ahora);
    private readonly AscenderAStaff ascender;
    private readonly RevocarStaff revocar;
    private readonly ListarStaff listar;
    private readonly ConsultarAuditoria consultar;
    private readonly Usuario administrador;

    public GestionDeStaffTests()
    {
        var autorizar = new AutorizarAcceso(usuarios, auditoria, reloj);
        var registrador = new RegistradorDeCambiosDeRol(cambios, eventos, reloj);
        ascender = new AscenderAStaff(autorizar, usuarios, registrador);
        revocar = new RevocarStaff(autorizar, usuarios, registrador);
        listar = new ListarStaff(autorizar, usuarios);
        consultar = new ConsultarAuditoria(autorizar, cambios, auditoria);
        administrador = Registrar(Rol.Administrador, "admin");
    }

    private Usuario Registrar(Rol rol, string nombreDeUsuario)
    {
        var datos = DatosDeRegistro.Crear("Persona de Prueba", "Pru", nombreDeUsuario, null, null);
        var persona = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);
        persona.CambiarRol(rol);
        usuarios.Guardados.Add(persona);
        return persona;
    }

    private Task<CambioDeRolAplicado> Ascender(string nombreDeUsuario, Guid? quien = null) =>
        ascender.Ejecutar(quien ?? administrador.Id, Contexto, nombreDeUsuario, CancellationToken.None);

    private Task<CambioDeRolAplicado> Revocar(Guid usuarioId, Guid? quien = null) =>
        revocar.Ejecutar(quien ?? administrador.Id, Contexto, usuarioId, CancellationToken.None);

    [Fact]
    public async Task Un_administrador_asciende_a_staff_a_un_usuario_por_su_nombre_de_usuario()
    {
        var ana = Registrar(Rol.Usuario, "ana.l");

        var resultado = await Ascender("ana.l");

        Assert.Equal(Rol.Staff, ana.Rol);
        Assert.Equal((Rol.Usuario, Rol.Staff), (resultado.RolAnterior, resultado.RolNuevo));
        Assert.Equal("ana.l", resultado.NombreDeUsuario);
    }

    [Fact]
    public async Task El_log_guarda_administrador_persona_rol_anterior_rol_nuevo_y_marca_de_tiempo()
    {
        var ana = Registrar(Rol.Usuario, "ana.l");

        await Ascender("ana.l");

        var registro = Assert.Single(cambios.Registrados);
        Assert.Equal(administrador.Id, registro.AdministradorId);
        Assert.Equal(ana.Id, registro.UsuarioAfectadoId);
        Assert.Equal((Rol.Usuario, Rol.Staff), (registro.RolAnterior, registro.RolNuevo));
        Assert.Equal(Ahora, registro.OcurrioEn);

        // El rol nuevo y su registro se guardan en la misma llamada (una sola transacción en la base de datos).
        Assert.Equal((ana.Id, Rol.Staff), Assert.Single(cambios.RolesGuardados));
    }

    [Fact]
    public async Task Publica_RolCambiado_para_notificar_a_la_persona()
    {
        var ana = Registrar(Rol.Usuario, "ana.l");

        await Ascender("ana.l");

        var evento = Assert.IsType<RolCambiado>(Assert.Single(eventos.Publicados));
        Assert.Equal(new RolCambiado(cambios.Registrados[0].Id, ana.Id, Rol.Usuario, Rol.Staff, Ahora), evento);
    }

    [Fact]
    public async Task Busca_el_usuario_sin_distinguir_mayusculas_ni_espacios()
    {
        var ana = Registrar(Rol.Usuario, "ana.l");

        await Ascender("  ANA.L ");

        Assert.Equal(Rol.Staff, ana.Rol);
    }

    [Theory]
    [InlineData(Rol.Usuario)]
    [InlineData(Rol.Staff)]
    public async Task Solo_un_administrador_gestiona_el_staff_y_cada_intento_sin_permiso_queda_auditado(Rol rolDeQuienPide)
    {
        var quien = Registrar(rolDeQuienPide, "quien");
        var ana = Registrar(Rol.Usuario, "ana.l");

        await Assert.ThrowsAsync<AccesoDenegado>(() => Ascender("ana.l", quien.Id));
        await Assert.ThrowsAsync<AccesoDenegado>(() => Revocar(ana.Id, quien.Id));

        Assert.Equal(Rol.Usuario, ana.Rol);
        Assert.Empty(cambios.Registrados);
        Assert.Empty(eventos.Publicados);
        Assert.Equal(2, auditoria.Registrados.Count);
        Assert.All(auditoria.Registrados, a => Assert.Equal(Rol.Administrador, a.RolRequerido));
    }

    [Fact]
    public async Task No_asciende_a_quien_ya_es_staff_ni_toca_a_un_administrador()
    {
        Registrar(Rol.Staff, "beto");
        var otraAdmin = Registrar(Rol.Administrador, "carla");

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Ascender("beto"));
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Ascender("carla"));

        Assert.Equal(Rol.Administrador, otraAdmin.Rol);
        Assert.Empty(cambios.Registrados);
        Assert.Empty(eventos.Publicados);
    }

    [Theory]
    [InlineData("nadie")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Avisa_si_no_hay_nadie_registrado_con_ese_usuario(string? nombreDeUsuario)
    {
        var error = await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Ascender(nombreDeUsuario!));

        Assert.Contains("No hay ninguna persona registrada", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Un_administrador_revoca_el_staff_y_queda_registrado()
    {
        var beto = Registrar(Rol.Staff, "beto");

        var resultado = await Revocar(beto.Id);

        Assert.Equal(Rol.Usuario, beto.Rol);
        Assert.Equal((Rol.Staff, Rol.Usuario), (resultado.RolAnterior, resultado.RolNuevo));
        var registro = Assert.Single(cambios.Registrados);
        Assert.Equal((Rol.Staff, Rol.Usuario), (registro.RolAnterior, registro.RolNuevo));
        Assert.IsType<RolCambiado>(Assert.Single(eventos.Publicados));
    }

    [Fact]
    public async Task No_revoca_a_un_usuario_regular_a_otro_administrador_ni_a_si_mismo()
    {
        var ana = Registrar(Rol.Usuario, "ana.l");
        var otraAdmin = Registrar(Rol.Administrador, "carla");

        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Revocar(ana.Id));
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Revocar(otraAdmin.Id));
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Revocar(administrador.Id));
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() => Revocar(Guid.NewGuid()));

        Assert.Equal(Rol.Administrador, administrador.Rol);
        Assert.Empty(cambios.Registrados);
    }

    [Fact]
    public async Task Lista_solo_al_staff_y_a_la_administracion()
    {
        Registrar(Rol.Usuario, "ana.l");
        Registrar(Rol.Staff, "beto");

        var staff = await listar.Ejecutar(administrador.Id, Contexto, CancellationToken.None);

        Assert.Equal(["admin", "beto"], staff.Select(m => m.NombreDeUsuario));
        Assert.Equal([Rol.Administrador, Rol.Staff], staff.Select(m => m.Rol));
    }

    [Fact]
    public async Task Un_staff_no_puede_ver_quien_es_staff()
    {
        var beto = Registrar(Rol.Staff, "beto");

        await Assert.ThrowsAsync<AccesoDenegado>(() => listar.Ejecutar(beto.Id, Contexto, CancellationToken.None));
    }

    [Fact]
    public async Task El_log_de_roles_se_lee_del_mas_reciente_al_mas_antiguo_y_por_paginas()
    {
        foreach (var nombre in new[] { "ana.l", "beto", "carla" })
        {
            Registrar(Rol.Usuario, nombre);
            await Ascender(nombre);
            reloj.Avanzar(TimeSpan.FromMinutes(1));
        }

        var primera = await consultar.CambiosDeRol(administrador.Id, Contexto, 2, null, CancellationToken.None);
        var segunda = await consultar.CambiosDeRol(administrador.Id, Contexto, 2, 2, CancellationToken.None);

        Assert.Equal(2, primera.Registros.Count);
        Assert.True(primera.HayMas);
        Assert.True(primera.Registros[0].OcurrioEn > primera.Registros[1].OcurrioEn);
        Assert.Single(segunda.Registros);
        Assert.False(segunda.HayMas);
    }

    [Fact]
    public async Task El_log_de_accesos_denegados_muestra_los_intentos_sin_permiso()
    {
        var curioso = Registrar(Rol.Usuario, "curioso");
        await Assert.ThrowsAsync<AccesoDenegado>(() => listar.Ejecutar(curioso.Id, Contexto, CancellationToken.None));

        var pagina = await consultar.AccesosDenegados(administrador.Id, Contexto, null, null, CancellationToken.None);

        var intento = Assert.Single(pagina.Registros);
        Assert.Equal(curioso.Id, intento.UsuarioId);
        Assert.Equal("POST /api/admin/staff", intento.Recurso);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(ConsultarAuditoria.LimiteMaximo + 1, 0)]
    [InlineData(10, -1)]
    public async Task Rechaza_una_paginacion_fuera_de_rango(int limite, int desplazamiento)
    {
        await Assert.ThrowsAsync<ExcepcionDeDominio>(() =>
            consultar.CambiosDeRol(administrador.Id, Contexto, limite, desplazamiento, CancellationToken.None));
    }

    [Fact]
    public async Task Solo_un_administrador_lee_los_logs()
    {
        var beto = Registrar(Rol.Staff, "beto");

        await Assert.ThrowsAsync<AccesoDenegado>(() => consultar.CambiosDeRol(beto.Id, Contexto, null, null, CancellationToken.None));
        await Assert.ThrowsAsync<AccesoDenegado>(() => consultar.AccesosDenegados(beto.Id, Contexto, null, null, CancellationToken.None));
    }
}
