using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;
using Treeve.Domain.Sugerencias;

namespace Treeve.Infrastructure.Persistence.Sugerencias;

public sealed class SugerenciaConfiguration : IEntityTypeConfiguration<Sugerencia>
{
    public void Configure(EntityTypeBuilder<Sugerencia> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("sugerencias");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UsuarioId).HasColumnName("usuario_id");
        builder.Property(s => s.Texto).HasColumnName("texto").HasMaxLength(TextoSugerencia.LongitudMaxima).IsRequired();
        builder.Property(s => s.Estado).HasColumnName("estado").HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.CreadaEn).HasColumnName("creada_en");

        // El historial propio consulta por persona; el listado de staff, por estado y por fecha (HU-11: 1000+ filas en < 2 s).
        builder.HasIndex(s => new { s.UsuarioId, s.CreadaEn }).HasDatabaseName("ix_sugerencias_usuario_id_creada_en");
        builder.HasIndex(s => new { s.Estado, s.CreadaEn }).HasDatabaseName("ix_sugerencias_estado_creada_en");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(s => s.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
