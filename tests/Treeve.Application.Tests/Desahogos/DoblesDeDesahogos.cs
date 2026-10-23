using Treeve.Application.Comun;
using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Services.Desahogos;

namespace Treeve.Application.Tests.Desahogos;

internal sealed class RepositorioNotasFalso : IRepositorioNotas
{
    public List<Nota> Guardadas { get; } = [];

    public Task Agregar(Nota nota, CancellationToken ct)
    {
        Guardadas.Add(nota);
        return Task.CompletedTask;
    }

    public Task<Nota?> ObtenerPorId(Guid notaId, CancellationToken ct) =>
        Task.FromResult(Guardadas.SingleOrDefault(n => n.Id == notaId));
}

internal sealed class PublicadorEventosFalso : IPublicadorEventos
{
    public List<IEventoDeDominio> Publicados { get; } = [];

    public Task Publicar<TEvento>(TEvento evento, CancellationToken ct)
        where TEvento : IEventoDeDominio
    {
        Publicados.Add(evento);
        return Task.CompletedTask;
    }
}
