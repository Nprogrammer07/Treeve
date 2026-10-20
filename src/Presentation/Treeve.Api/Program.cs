using Microsoft.AspNetCore.HttpOverrides;
using Treeve.Api.Composition;
using Treeve.Api.Endpoints.Identidad;
using Treeve.Api.Endpoints.Salud;
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
// Retry-After se expone para que el frontend sepa cuánto falta para desbloquear la cuenta (HU-03a);
// sin esto, el navegador la oculta en peticiones entre dominios.
var origenesPermitidos = builder.Configuration.GetSection("Cors:Origenes").Get<string[]>() ?? [];
builder.Services.AddCors(opciones => opciones.AddDefaultPolicy(
    politica => politica.WithOrigins(origenesPermitidos).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Retry-After")));

builder.Services
    .AddApplicationServices()
    .AddInfrastructure(builder.Configuration)
    .AddAutenticacion();

builder.Services.AddExceptionHandler<ManejadorDeExcepciones>();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

var app = builder.Build();

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

// Endpoints por área, definidos en Endpoints/. Ejemplo: app.MapDesahogosEndpoints();

app.Run();
