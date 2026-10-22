using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;
using Treeve.Domain.MensajesApoyo;

namespace Treeve.Infrastructure.Persistence.MensajesApoyo;

public sealed class RespuestaRegistradaConfiguration : IEntityTypeConfiguration<RespuestaRegistrada>
{
    public void Configure(EntityTypeBuilder<RespuestaRegistrada> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // Sin texto, sin tema y sin emoción: solo los ids de los fragmentos, cifrados (ADR-001).
        builder.ToTable("historial_respuestas");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.UsuarioId).HasColumnName("usuario_id");
        builder.Property(r => r.FragmentosCifrados).HasColumnName("fragmentos_cifrados").IsRequired();
        builder.Property(r => r.CreadaEn).HasColumnName("creada_en");

        builder.HasIndex(r => new { r.UsuarioId, r.CreadaEn }).HasDatabaseName("ix_historial_respuestas_usuario_id_creada_en");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(r => r.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
