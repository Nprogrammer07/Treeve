using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.Identidad;

public sealed class AccesoNoAutorizadoConfiguration : IEntityTypeConfiguration<AccesoNoAutorizado>
{
    public void Configure(EntityTypeBuilder<AccesoNoAutorizado> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // HU-10: auditoría de intentos sin permiso. Sin llave foránea a propósito: el registro de auditoría no
        // debe desaparecer si algún día se borra a la persona.
        builder.ToTable("auditoria_accesos");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.UsuarioId).HasColumnName("usuario_id");
        builder.Property(a => a.OcurrioEn).HasColumnName("ocurrio_en");
        builder.Property(a => a.Ip).HasColumnName("ip").HasMaxLength(AccesoNoAutorizado.IpMaxima).IsRequired();
        builder.Property(a => a.Recurso).HasColumnName("recurso").HasMaxLength(AccesoNoAutorizado.RecursoMaximo).IsRequired();
        builder.Property(a => a.RolRequerido).HasColumnName("rol_requerido").HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(a => a.OcurrioEn).HasDatabaseName("ix_auditoria_accesos_ocurrio_en");
    }
}
