using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

public sealed class SesionConfiguration : IEntityTypeConfiguration<Sesion>
{
    public void Configure(EntityTypeBuilder<Sesion> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("sesiones");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UsuarioId).HasColumnName("usuario_id");
        builder.Property(s => s.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
        builder.Property(s => s.CreadaEn).HasColumnName("creada_en");
        builder.Property(s => s.ExpiraEn).HasColumnName("expira_en");

        builder.HasIndex(s => s.TokenHash).IsUnique().HasDatabaseName("ux_sesiones_token_hash");
        builder.HasIndex(s => s.UsuarioId).HasDatabaseName("ix_sesiones_usuario_id");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(s => s.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
