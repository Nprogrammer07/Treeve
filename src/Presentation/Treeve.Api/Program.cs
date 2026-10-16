using Microsoft.AspNetCore.HttpOverrides;
using Treeve.Api.Composition;
using Treeve.Api.Endpoints.Salud;
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

builder.Services
    .AddApplicationServices()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// ADR-002: en el entorno compartido las migraciones se aplican al arrancar.
if (app.Configuration.GetValue<bool>("Persistencia:AplicarMigraciones"))
{
    await app.Services.AplicarMigraciones(app.Lifetime.ApplicationStopping);
}

app.MapHealthChecks("/health"); // el proceso está vivo (no consulta la base de datos)
app.MapSaludEndpoints();        // /health/ready: valida la conexión con la base de datos

// Endpoints por área, definidos en Endpoints/. Ejemplo: app.MapDesahogosEndpoints();

app.Run();
