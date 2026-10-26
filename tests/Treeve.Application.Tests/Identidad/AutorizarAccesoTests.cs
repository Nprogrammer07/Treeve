using Treeve.Application.Comun;
using Treeve.Application.Identidad;
using Treeve.Domain.Identidad;

namespace Treeve.Application.Tests.Identidad;

public class AutorizarAccesoTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 26, 14, 0, 0, TimeSpan.FromHours(-5));
    private static readonly ContextoDeAcceso Contexto = new("203.0.113.7", "GET /api/staff/acceso");

    private readonly RepositorioUsuariosFalso usuarios = new();
    private readonly RepositorioAuditoriaFalso auditoria = new();
    private readonly AutorizarAcceso autorizar;

    public AutorizarAccesoTests()
    {
        autorizar = new AutorizarAcceso(usuarios, auditoria, new RelojManual(Ahora));
    }

    private Usuario Registrar(Rol rol)
    {
        var datos = DatosDeRegistro.Crear("Persona de Prueba", "Pru", $"pru{usuarios.Guardados.Count}", null, null);
        var usuario = Usuario.Registrar(Guid.NewGuid(), datos, null, Ahora);
        usuario.CambiarRol(rol);
        usuarios.Guardados.Add(usuario);
        return usuario;
    }

    [Theory]
    [InlineData(Rol.Staff, Rol.Staff)]
    [InlineData(Rol.Administrador, Rol.Staff)]
    [InlineData(Rol.Administrador, Rol.Administrador)]
    public async Task Entra_quien_tiene_el_rol_pedido_o_uno_mayor(Rol rolDeLaPersona, Rol requerido)
    {
        var persona = Registrar(rolDeLaPersona);

        var rol = await autorizar.Ejecutar(persona.Id, requerido, Contexto, CancellationToken.None);

        Assert.Equal(rolDeLaPersona, rol);
        Assert.Empty(auditoria.Registrados);
    }

    [Theory]
    [InlineData(Rol.Usuario, Rol.Staff)]
    [InlineData(Rol.Usuario, Rol.Administrador)]
    [InlineData(Rol.Staff, Rol.Administrador)]
    public async Task No_entra_quien_tiene_un_rol_menor_y_el_intento_queda_registrado(Rol rolDeLaPersona, Rol requerido)
    {
        var persona = Registrar(rolDeLaPersona);

        await Assert.ThrowsAsync<AccesoDenegado>(
            () => autorizar.Ejecutar(persona.Id, requerido, Contexto, CancellationToken.None));

        var registro = Assert.Single(auditoria.Registrados);
        Assert.Equal(persona.Id, registro.UsuarioId);
        Assert.Equal(Ahora, registro.OcurrioEn);
        Assert.Equal("203.0.113.7", registro.Ip);
        Assert.Equal("GET /api/staff/acceso", registro.Recurso);
        Assert.Equal(requerido, registro.RolRequerido);
    }

    [Fact]
    public async Task Una_persona_que_ya_no_existe_tambien_se_niega_y_se_registra()
    {
        var inexistente = Guid.NewGuid();

        await Assert.ThrowsAsync<AccesoDenegado>(
            () => autorizar.Ejecutar(inexistente, Rol.Staff, Contexto, CancellationToken.None));

        Assert.Equal(inexistente, Assert.Single(auditoria.Registrados).UsuarioId);
    }

    [Fact]
    public async Task Revocar_el_rol_vale_desde_la_siguiente_peticion()
    {
        var persona = Registrar(Rol.Staff);
        await autorizar.Ejecutar(persona.Id, Rol.Staff, Contexto, CancellationToken.None);

        persona.CambiarRol(Rol.Usuario); // HU-12

        await Assert.ThrowsAsync<AccesoDenegado>(
            () => autorizar.Ejecutar(persona.Id, Rol.Staff, Contexto, CancellationToken.None));
        Assert.Single(auditoria.Registrados);
    }

    [Fact]
    public async Task Cada_intento_deja_su_propio_registro()
    {
        var persona = Registrar(Rol.Usuario);

        for (var i = 0; i < 3; i++)
        {
            await Assert.ThrowsAsync<AccesoDenegado>(
                () => autorizar.Ejecutar(persona.Id, Rol.Staff, Contexto, CancellationToken.None));
        }

        Assert.Equal(3, auditoria.Registrados.Count);
        Assert.Equal(3, auditoria.Registrados.Select(r => r.Id).Distinct().Count());
    }

    [Fact]
    public async Task Sin_ip_el_registro_dice_que_es_desconocida()
    {
        var persona = Registrar(Rol.Usuario);

        await Assert.ThrowsAsync<AccesoDenegado>(
            () => autorizar.Ejecutar(persona.Id, Rol.Staff, new ContextoDeAcceso(null, "GET /api/staff/acceso"), CancellationToken.None));

        Assert.Equal(AccesoNoAutorizado.IpDesconocida, Assert.Single(auditoria.Registrados).Ip);
    }

    [Fact]
    public async Task Un_rol_inexistente_como_requisito_es_un_error_de_programacion()
    {
        var persona = Registrar(Rol.Administrador);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => autorizar.Ejecutar(persona.Id, (Rol)99, Contexto, CancellationToken.None));
    }

    [Fact]
    public void El_contexto_no_imprime_la_ip()
    {
        Assert.DoesNotContain("203.0.113.7", Contexto.ToString(), StringComparison.Ordinal);
    }
}
