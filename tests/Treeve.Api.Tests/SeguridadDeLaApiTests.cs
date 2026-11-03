using System.Net;
using System.Net.Http.Json;

namespace Treeve.Api.Tests;

/// <summary>
/// TEC-05 (ADR-009): los RNF de seguridad comprobados sobre la API completa, recorriendo todas sus rutas. Una ruta nueva
/// queda revisada sin escribir otra prueba: si no pide sesión o no valida el rol, la CI falla.
/// </summary>
public sealed class SeguridadDeLaApiTests(ApiDePruebas api) : IClassFixture<ApiDePruebas>
{
    /// <summary>Las únicas rutas sin sesión. Agregar otra es una decisión consciente: se agrega aquí.</summary>
    private static readonly string[] RutasPublicas =
    [
        "GET /health",
        "GET /health/ready",
        "POST /api/auth/login",
        "POST /api/auth/recuperacion",
        "POST /api/auth/recuperacion/restablecer",
        "POST /api/auth/registro",
    ];

    private IEnumerable<Ruta> RutasQueEmpiezanPor(string prefijo) =>
        api.Rutas().Where(r => r.Patron.StartsWith(prefijo, StringComparison.Ordinal));

    private static async Task<string> Enviar(HttpClient cliente, Ruta ruta, string? token = null)
    {
        using var peticion = ruta.Peticion(token);
        using var respuesta = await cliente.SendAsync(peticion);
        return $"{(int)respuesta.StatusCode}";
    }

    [FactConPostgres]
    public void Solo_las_rutas_de_registro_inicio_de_sesion_recuperacion_y_salud_son_publicas()
    {
        var publicas = api.Rutas().Where(r => r.EsPublica).Select(r => r.ToString()).Order(StringComparer.Ordinal);

        Assert.Equal(RutasPublicas.Order(StringComparer.Ordinal), publicas);
    }

    [FactConPostgres]
    public async Task Toda_ruta_privada_responde_401_sin_sesion_o_con_un_token_inventado()
    {
        using var cliente = api.Cliente();
        var privadas = api.Rutas().Where(r => !r.EsPublica).ToList();
        Assert.NotEmpty(privadas);

        var fallas = new List<string>();
        foreach (var ruta in privadas)
        {
            foreach (var token in new[] { null, "token-inventado" })
            {
                var estado = await Enviar(cliente, ruta, token);
                if (estado != "401")
                {
                    fallas.Add($"{ruta} con {(token is null ? "ninguna sesión" : "un token inventado")} respondió {estado}");
                }
            }
        }

        Assert.Empty(fallas);
    }

    [FactConPostgres]
    public async Task Una_persona_usuaria_recibe_403_en_staff_y_administracion_y_cada_intento_queda_en_la_auditoria()
    {
        var persona = await api.Registrar();
        using var cliente = api.Cliente();
        var protegidas = RutasQueEmpiezanPor("/api/staff").Concat(RutasQueEmpiezanPor("/api/admin")).ToList();
        Assert.NotEmpty(protegidas);

        var fallas = new List<string>();
        foreach (var ruta in protegidas)
        {
            var estado = await Enviar(cliente, ruta, persona.Token);
            if (estado != "403")
            {
                fallas.Add($"{ruta} respondió {estado}");
            }
        }

        Assert.Empty(fallas);
        // HU-10: cada intento sin permiso queda registrado con la persona, la fecha y la IP.
        Assert.Equal(protegidas.Count, await api.Contar("SELECT count(*) FROM treeve.auditoria_accesos WHERE usuario_id = @id", ("id", persona.Id)));
    }

    [FactConPostgres]
    public async Task El_staff_entra_a_su_zona_pero_recibe_403_en_administracion()
    {
        var staff = await api.Registrar();
        await api.AsignarRol(staff.Id, "Staff");
        using var cliente = api.Cliente(staff.Token);

        Assert.Equal(HttpStatusCode.OK, (await cliente.GetAsync("/api/staff/acceso")).StatusCode);

        var fallas = new List<string>();
        foreach (var ruta in RutasQueEmpiezanPor("/api/admin"))
        {
            var estado = await Enviar(cliente, ruta, staff.Token);
            if (estado != "403")
            {
                fallas.Add($"{ruta} respondió {estado}");
            }
        }

        Assert.Empty(fallas);
    }

    [FactConPostgres]
    public async Task Solo_la_persona_duena_puede_leer_su_desahogo()
    {
        var duena = await api.Registrar();
        var otra = await api.Registrar();
        var staff = await api.Registrar();
        var administracion = await api.Registrar();
        await api.AsignarRol(staff.Id, "Staff");
        await api.AsignarRol(administracion.Id, "Administrador");

        var notaId = await Desahogarse(duena, "Un texto que solo es de quien lo escribió.");

        using (var cliente = api.Cliente(duena.Token))
        {
            Assert.Equal(HttpStatusCode.OK, (await cliente.GetAsync($"/api/desahogos/{notaId}")).StatusCode);
        }

        // HU-05: ninguna otra persona, ni el staff ni la administración, puede leerlo desde la API.
        foreach (var ajena in new[] { otra, staff, administracion })
        {
            using var cliente = api.Cliente(ajena.Token);
            using var respuesta = await cliente.GetAsync($"/api/desahogos/{notaId}");
            Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
            Assert.DoesNotContain("solo es de quien", await respuesta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }
    }

    [FactConPostgres]
    public async Task El_texto_del_desahogo_no_sale_en_ninguna_consulta_del_staff_ni_de_la_administracion()
    {
        var persona = await api.Registrar();
        var marca = Marca();
        await Desahogarse(persona, $"Hoy escribo {marca} para ver si alguien más lo puede leer.");

        var staff = await api.Registrar();
        var administracion = await api.Registrar();
        await api.AsignarRol(staff.Id, "Staff");
        await api.AsignarRol(administracion.Id, "Administrador");

        var consultas = RutasQueEmpiezanPor("/api/staff").Concat(RutasQueEmpiezanPor("/api/admin"))
            .Where(r => r.Metodo == "GET" && !r.Patron.Contains('{', StringComparison.Ordinal))
            .ToList();
        Assert.NotEmpty(consultas);

        foreach (var cuenta in new[] { staff, administracion })
        {
            using var cliente = api.Cliente(cuenta.Token);
            foreach (var ruta in consultas.Where(r => cuenta == administracion || r.Patron.StartsWith("/api/staff", StringComparison.Ordinal)))
            {
                using var respuesta = await cliente.GetAsync(ruta.Ejemplo);
                Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
                Assert.DoesNotContain(marca, await respuesta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
            }
        }
    }

    [FactConPostgres]
    public async Task El_texto_del_desahogo_se_guarda_cifrado_y_nunca_aparece_en_el_log_ni_en_los_errores()
    {
        var persona = await api.Registrar();
        var marca = Marca();

        // Un desahogo normal, uno con una frase de crisis (camino del mensaje fijo) y uno demasiado largo (camino del error).
        await Desahogarse(persona, $"Hoy en el trabajo pasó algo: {marca}.");
        await Desahogarse(persona, $"Quiero desaparecer, {marca}.");
        using (var cliente = api.Cliente(persona.Token))
        {
            using var demasiadoLargo = await cliente.PostAsJsonAsync("/api/desahogos", new { emocion = "tristeza", texto = $"{marca} {new string('a', 2100)}" });
            Assert.Equal(HttpStatusCode.BadRequest, demasiadoLargo.StatusCode);
            Assert.DoesNotContain(marca, await demasiadoLargo.Content.ReadAsStringAsync(), StringComparison.Ordinal);

            using var sinEmocion = await cliente.PostAsJsonAsync("/api/desahogos", new { emocion = "nostalgia", texto = marca });
            Assert.Equal(HttpStatusCode.BadRequest, sinEmocion.StatusCode);
            Assert.DoesNotContain(marca, await sinEmocion.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }

        // HU-05: cifrado en reposo. Ninguna tabla guarda el texto en claro.
        Assert.Equal(2, await api.Contar("SELECT count(*) FROM treeve.desahogos WHERE usuario_id = @id", ("id", persona.Id)));
        Assert.DoesNotContain(marca, await api.TodaLaBaseComoTexto(), StringComparison.Ordinal);

        // CLAUDE.md, regla 4: el texto nunca se escribe en el log, en ningún nivel.
        Assert.NotEmpty(api.Logs.Lineas);
        Assert.DoesNotContain(api.Logs.Lineas, linea => linea.Contains(marca, StringComparison.Ordinal));
    }

    [FactConPostgres]
    public async Task El_error_de_inicio_de_sesion_no_dice_que_dato_fallo()
    {
        var persona = await api.Registrar();
        using var cliente = api.Cliente();

        using var usuarioQueNoExiste = await cliente.PostAsJsonAsync("/api/auth/login", new { identificador = "nadie-se-llama-asi", contrasena = "Clave-de-prueba-1" });
        using var contrasenaEquivocada = await cliente.PostAsJsonAsync("/api/auth/login", new { identificador = persona.Usuario, contrasena = "Otra-clave-9" });

        Assert.Equal(HttpStatusCode.Unauthorized, usuarioQueNoExiste.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, contrasenaEquivocada.StatusCode);
        Assert.Equal(await usuarioQueNoExiste.Content.ReadAsStringAsync(), await contrasenaEquivocada.Content.ReadAsStringAsync());
    }

    [FactConPostgres]
    public async Task Tras_5_intentos_fallidos_la_cuenta_se_bloquea_aunque_la_contrasena_sea_correcta()
    {
        var persona = await api.Registrar("Clave-correcta-1");
        using var cliente = api.Cliente();

        for (var intento = 1; intento <= 5; intento++)
        {
            using var fallido = await cliente.PostAsJsonAsync("/api/auth/login", new { identificador = persona.Usuario, contrasena = "Clave-equivocada-1" });
            Assert.Equal(HttpStatusCode.Unauthorized, fallido.StatusCode);
        }

        // HU-03a: bloqueo temporal de 15 minutos; la respuesta dice cuánto falta.
        using var bloqueado = await cliente.PostAsJsonAsync("/api/auth/login", new { identificador = persona.Usuario, contrasena = "Clave-correcta-1" });
        Assert.Equal(HttpStatusCode.TooManyRequests, bloqueado.StatusCode);
        Assert.True(bloqueado.Headers.RetryAfter?.Delta > TimeSpan.Zero);
    }

    [FactConPostgres]
    public async Task La_API_rechaza_las_peticiones_sin_HTTPS_y_manda_HSTS()
    {
        using var inseguro = api.Cliente(new Uri($"http://{ApiDePruebas.Anfitrion}"));
        using var respuesta = await inseguro.PostAsJsonAsync("/api/auth/login", new { identificador = "alguien", contrasena = "Clave-de-prueba-1" });

        // HU-02: todo por HTTPS. La contraseña nunca se procesa si llega por HTTP.
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Contains("HTTPS_REQUERIDO", await respuesta.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        using var seguro = api.Cliente();
        using var conHttps = await seguro.GetAsync("/health");
        Assert.True(conHttps.Headers.Contains("Strict-Transport-Security"));
    }

    private async Task<Guid> Desahogarse(Cuenta cuenta, string texto)
    {
        using var cliente = api.Cliente(cuenta.Token);
        using var respuesta = await cliente.PostAsJsonAsync("/api/desahogos", new { emocion = "tristeza", texto });
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<NotaCreada>())!.NotaId;
    }

    /// <summary>Una palabra que no existe en ningún otro lado: si aparece, salió del texto del desahogo.</summary>
    private static string Marca() => $"marca{Guid.NewGuid():N}";

    private sealed record NotaCreada(Guid NotaId);
}
