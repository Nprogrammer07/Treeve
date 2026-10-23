using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Desahogos;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.Desahogos;

public sealed class NotaConfiguration : IEntityTypeConfiguration<Nota>
{
    public void Configure(EntityTypeBuilder<Nota> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // El texto solo se guarda cifrado (ADR-002, HU-05): AES-256-GCM en una columna bytea.
        builder.ToTable("desahogos");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id).HasColumnName("id");
        builder.Property(n => n.UsuarioId).HasColumnName("usuario_id");
        builder.Property(n => n.Emocion).HasColumnName("emocion").HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.TextoCifrado).HasColumnName("texto_cifrado").IsRequired();
        builder.Property(n => n.CreadaEn).HasColumnName("creada_en");

        builder.HasIndex(n => new { n.UsuarioId, n.CreadaEn }).HasDatabaseName("ix_desahogos_usuario_id_creada_en");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(n => n.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
