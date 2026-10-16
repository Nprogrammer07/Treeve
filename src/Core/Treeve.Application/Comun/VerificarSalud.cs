namespace Treeve.Application.Comun;

/// <summary>Puerto hacia la base de datos para comprobar que responde. Lo implementa Infrastructure.</summary>
public interface IVerificadorDeBaseDeDatos
{
    Task<bool> EstaDisponible(CancellationToken ct);
}

public sealed record EstadoDeSalud(bool BaseDeDatosDisponible)
{
    public bool EstaSano => BaseDeDatosDisponible;
}

/// <summary>TEC-02: informa si el backend puede trabajar (hoy, si llega a la base de datos).</summary>
public sealed class VerificarSalud(IVerificadorDeBaseDeDatos baseDeDatos)
{
    public async Task<EstadoDeSalud> Ejecutar(CancellationToken ct) =>
        new(await baseDeDatos.EstaDisponible(ct));
}
