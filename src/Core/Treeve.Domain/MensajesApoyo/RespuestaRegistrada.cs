namespace Treeve.Domain.MensajesApoyo;

/// <summary>
/// Una respuesta ya enviada, para no repetir sus fragmentos en las siguientes (ADR-001, paso 7).
/// Los ids se guardan cifrados: el id de un reflejo delata el tema del desahogo, y el tema nunca se guarda
/// legible. Las respuestas de crisis no se registran.
/// </summary>
public sealed class RespuestaRegistrada
{
    private RespuestaRegistrada(Guid id, Guid usuarioId, byte[] fragmentosCifrados, DateTimeOffset creadaEn)
    {
        Id = id;
        UsuarioId = usuarioId;
        FragmentosCifrados = fragmentosCifrados;
        CreadaEn = creadaEn;
    }

    public Guid Id { get; }
    public Guid UsuarioId { get; }
    public byte[] FragmentosCifrados { get; }
    public DateTimeOffset CreadaEn { get; }

    /// <summary>El id llega desde afuera porque los fragmentos se cifran atados a él.</summary>
    public static RespuestaRegistrada Crear(Guid id, Guid usuarioId, byte[] fragmentosCifrados, DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(fragmentosCifrados);

        if (fragmentosCifrados.Length == 0)
        {
            throw new ArgumentException("La respuesta debe llevar sus fragmentos cifrados.", nameof(fragmentosCifrados));
        }

        return new RespuestaRegistrada(id, usuarioId, fragmentosCifrados, ahora);
    }

    public override string ToString() => "[respuesta registrada]";
}
