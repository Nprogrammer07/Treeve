using Treeve.Application.Comun;

namespace Treeve.Application.Tests.Comun;

public class VerificarSaludTests
{
    [Fact]
    public async Task Esta_sano_cuando_la_base_de_datos_responde()
    {
        var estado = await new VerificarSalud(new VerificadorFalso(disponible: true)).Ejecutar(CancellationToken.None);

        Assert.True(estado.EstaSano);
    }

    [Fact]
    public async Task No_esta_sano_cuando_la_base_de_datos_no_responde()
    {
        var estado = await new VerificarSalud(new VerificadorFalso(disponible: false)).Ejecutar(CancellationToken.None);

        Assert.False(estado.EstaSano);
    }

    private sealed class VerificadorFalso(bool disponible) : IVerificadorDeBaseDeDatos
    {
        public Task<bool> EstaDisponible(CancellationToken ct) => Task.FromResult(disponible);
    }
}
