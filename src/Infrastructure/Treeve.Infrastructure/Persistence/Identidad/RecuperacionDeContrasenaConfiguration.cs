using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

public sealed class RecuperacionDeContrasenaConfiguration : IEntityTypeConfiguration<RecuperacionDeContrasena>
{
    public void Configure(EntityTypeBuilder<RecuperacionDeContrasena> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // HU-03b: solo se guarda el hash (SHA-256 en hexadecimal) del token del enlace.
        builder.ToTable("recuperaciones_contrasena");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.UsuarioId).HasColumnName("usuario_id");
        builder.Property(r => r.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
        builder.Property(r => r.CreadaEn).HasColumnName("creada_en");
        builder.Property(r => r.ExpiraEn).HasColumnName("expira_en");
        builder.Property(r => r.UsadaEn).HasColumnName("usada_en");

        builder.HasIndex(r => r.TokenHash).IsUnique().HasDatabaseName("ux_recuperaciones_contrasena_token_hash");
        builder.HasIndex(r => new { r.UsuarioId, r.CreadaEn }).HasDatabaseName("ix_recuperaciones_contrasena_usuario_id_creada_en");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(r => r.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
