using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

public sealed class CredencialConfiguration : IEntityTypeConfiguration<Credencial>
{
    public void Configure(EntityTypeBuilder<Credencial> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("credenciales");
        builder.HasKey(c => c.UsuarioId);

        builder.Property(c => c.UsuarioId).HasColumnName("usuario_id");
        builder.Property(c => c.HashDeContrasena).HasColumnName("hash_de_contrasena").HasMaxLength(200).IsRequired();
        builder.Property(c => c.IntentosFallidos).HasColumnName("intentos_fallidos");
        builder.Property(c => c.BloqueadoHasta).HasColumnName("bloqueado_hasta");
        builder.Property(c => c.ActualizadaEn).HasColumnName("actualizada_en");

        builder.HasOne<Usuario>().WithOne().HasForeignKey<Credencial>(c => c.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
