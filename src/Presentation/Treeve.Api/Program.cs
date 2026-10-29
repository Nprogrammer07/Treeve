using Microsoft.AspNetCore.HttpOverrides;
using Treeve.Api.Composition;
using Treeve.Api.Correlacion;
using Treeve.Api.Endpoints.Desahogos;
using Treeve.Api.Endpoints.EspacioVerde;
using Treeve.Api.Endpoints.Identidad;
using Treeve.Api.Endpoints.Salud;
using Treeve.Api.Endpoints.Staff;
using Treeve.Api.Endpoints.Sugerencias;
using Treeve.Api.Errores;
using Treeve.Api.Seguridad;
using Treeve.Infrastructure;
using Treeve.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Railway (y otras plataformas) indican el puerto en la variable PORT.
var puerto = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(puerto))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{puerto}");
}

// La plataforma termina TLS y reenvía por HTTP interno: se confía en X-Forwarded-* para saber
// que la petición original fue HTTPS. La API solo es alcanzable a través de ese proxy.
builder.Services.Configure<ForwardedHeadersOptions>(opciones =>
{
    opciones.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    opciones.KnownIPNetworks.Clear();
    opciones.KnownProxies.Clear();
});

// El frontend vive en otro dominio (Vercel): solo se aceptan los orígenes de Cors:Origenes.
// En el entorno: Cors__Origenes__0=https://tu-frontend.vercel.app
// Retry-After se expone para que el frontend sepa cuánto falta para desbloquear la cuenta (HU-03a), y
// X-Correlation-Id para poder citarlo al reportar un problema (TEC-03); sin esto, el navegador oculta las
// cabeceras en peticiones entre dominios.
var origenesPermitidos = builder.Configuration.GetSection("Cors:Origenes").Get<string[]>() ?? [];
builder.Services.AddCors(opciones => opciones.AddDefaultPolicy(
    politica => politica.WithOrigins(origenesPermitidos).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Retry-After", CorrelacionMiddleware.Cabecera)));

builder.Services
    .AddApplicationServices()
    .AddInfrastructure(builder.Configuration)
    .AddAutenticacion();

builder.Services.AddExceptionHandler<ManejadorDeExcepciones>();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UsarIdDeCorrelacion(); // TEC-03: primero, para que todo el log de la petición lleve el id
app.UseForwardedHeaders();
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.ExigirHttpsEnLaApi();
}

// ADR-002: en el entorno compartido las migraciones se aplican al arrancar.
if (app.Configuration.GetValue<bool>("Persistencia:AplicarMigraciones"))
{
    await app.Services.AplicarMigraciones(app.Lifetime.ApplicationStopping);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health"); // el proceso está vivo (no consulta la base de datos)
app.MapSaludEndpoints();        // /health/ready: valida la conexión con la base de datos
app.MapIdentidadEndpoints();    // HU-02: registro

app.MapDesahogosEndpoints();    // HU-05: guardar y leer desahogos (solo la persona dueña)
app.MapEspacioVerdeEndpoints(); // HU-07a: el lote de la persona y cómo crece
app.MapSugerenciasEndpoints();  // HU-09: enviar una sugerencia y ver el historial propio
app.MapStaffEndpoints();        // HU-10: zona de staff (rol validado en cada petición)

// Endpoints por área, definidos en Endpoints/.

app.Run();
