using System.Security.Claims;
using Treeve.Api.Autenticacion;
using Treeve.Application.Identidad;

namespace Treeve.Api.Endpoints.Identidad;

public sealed record RegistroRequest(
    string? NombreCompleto,
    string? Apodo,
    string? NombreDeUsuario,
    string? Contrasena,
    string? Correo,
    string? MotivoDeRegistro)
{
    public override string ToString() => "[registro]"; // lleva una contraseña: nunca se imprime
}

public sealed record LoginRequest(string? Identificador, string? Contrasena)
{
    public override string ToString() => "[login]"; // lleva una contraseña: nunca se imprime
}

public sealed record SolicitudDeRecuperacionRequest(string? Correo)
{
    public override string ToString() => "[solicitud de recuperación]"; // lleva un correo: nunca se imprime
}

public sealed record RestablecerContrasenaRequest(string? Token, string? Contrasena)
{
    public override string ToString() => "[restablecer contraseña]"; // lleva el token y una contraseña: nunca se imprime
}

public sealed record MensajeResponse(string Mensaje);

public sealed record SesionResponse(Guid UsuarioId, string Apodo, string Token, DateTimeOffset ExpiraEn)
{
    public override string ToString() => "[sesión]";
}

public sealed record YoResponse(Guid UsuarioId);

public static class IdentidadEndpoints
{
    public static IEndpointRouteBuilder MapIdentidadEndpoints(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/auth");

        // HU-02: registro con datos mínimos. Responde con la sesión abierta (acceso automático).
        grupo.MapPost("/registro", async (RegistroRequest request, RegistrarUsuario registrarUsuario, CancellationToken ct) =>
        {
            var sesion = await registrarUsuario.Ejecutar(
                new RegistrarUsuarioComando(
                    request.NombreCompleto,
                    request.Apodo,
                    request.NombreDeUsuario,
                    request.Contrasena,
                    request.Correo,
                    request.MotivoDeRegistro),
                ct);

            return Results.Created("/api/auth/yo", new SesionResponse(sesion.UsuarioId, sesion.Apodo, sesion.Token, sesion.ExpiraEn));
        }).AllowAnonymous();

        // HU-03a: inicio de sesión con usuario o correo. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.
        grupo.MapPost("/login", async (LoginRequest request, IniciarSesion iniciarSesion, CancellationToken ct) =>
        {
            var sesion = await iniciarSesion.Ejecutar(new IniciarSesionComando(request.Identificador, request.Contrasena), ct);

            return Results.Ok(new SesionResponse(sesion.UsuarioId, sesion.Apodo, sesion.Token, sesion.ExpiraEn));
        }).AllowAnonymous();

        // HU-03b: pide el enlace de recuperación. Responde 202 con el mismo mensaje exista o no el correo.
        grupo.MapPost("/recuperacion", async (SolicitudDeRecuperacionRequest request, SolicitarRecuperacion solicitar, CancellationToken ct) =>
        {
            await solicitar.Ejecutar(new SolicitarRecuperacionComando(request.Correo), ct);

            return Results.Accepted(value: new MensajeResponse(
                "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam."));
        }).AllowAnonymous();

        // HU-03b: cambia la contraseña con el token del enlace (un solo uso, vence a los 30 minutos).
        grupo.MapPost("/recuperacion/restablecer", async (RestablecerContrasenaRequest request, RestablecerContrasena restablecer, CancellationToken ct) =>
        {
            await restablecer.Ejecutar(new RestablecerContrasenaComando(request.Token, request.Contrasena), ct);

            return Results.NoContent();
        }).AllowAnonymous();

        // Sirve para comprobar que el token funciona. El resto de endpoints protegidos usarán RequireAuthorization().
        grupo.MapGet("/yo", (ClaimsPrincipal usuario) => Results.Ok(new YoResponse(usuario.ObtenerUsuarioId())))
            .RequireAuthorization();

        return app;
    }
}
