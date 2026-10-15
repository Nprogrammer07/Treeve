using Treeve.Api.Composition;
using Treeve.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplicationServices()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/health");

// Endpoints por área, definidos en Endpoints/. Ejemplo: app.MapDesahogosEndpoints();

app.Run();
