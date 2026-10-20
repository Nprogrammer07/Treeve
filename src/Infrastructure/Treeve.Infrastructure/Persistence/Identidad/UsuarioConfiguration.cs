using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

public sealed class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("usuarios");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id).HasColumnName("id");
        builder.Property(u => u.NombreCompleto).HasColumnName("nombre_completo")
            .HasMaxLength(ReglasDeIdentidad.NombreCompletoMaximo).IsRequired();
        builder.Property(u => u.Apodo).HasColumnName("apodo")
            .HasMaxLength(ReglasDeIdentidad.ApodoMaximo).IsRequired();
        builder.Property(u => u.NombreDeUsuario).HasColumnName("nombre_de_usuario")
            .HasMaxLength(ReglasDeIdentidad.NombreDeUsuarioMaximo).IsRequired();
        builder.Property(u => u.Correo).HasColumnName("correo")
            .HasMaxLength(ReglasDeIdentidad.CorreoMaximo);
        builder.Property(u => u.MotivoDeRegistroCifrado).HasColumnName("motivo_de_registro_cifrado"); // byte[] → bytea
        builder.Property(u => u.CreadoEn).HasColumnName("creado_en");

        // Los valores se guardan normalizados (minúsculas), así la unicidad no distingue mayúsculas.
        // Un correo vacío es NULL y PostgreSQL permite varios NULL en un índice único.
        builder.HasIndex(u => u.NombreDeUsuario).IsUnique().HasDatabaseName("ux_usuarios_nombre_de_usuario");
        builder.HasIndex(u => u.Correo).IsUnique().HasDatabaseName("ux_usuarios_correo");
    }
}
