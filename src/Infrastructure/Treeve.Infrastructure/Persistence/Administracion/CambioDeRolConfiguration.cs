using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Administracion;

namespace Treeve.Infrastructure.Persistence.Administracion;

public sealed class CambioDeRolConfiguration : IEntityTypeConfiguration<CambioDeRol>
{
    public void Configure(EntityTypeBuilder<CambioDeRol> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // HU-12: log de cambios de rol. Sin llaves foráneas a propósito, como auditoria_accesos: el registro no debe
        // desaparecer si algún día se borra a una persona. La migración lo hace inmutable (ADR-006).
        builder.ToTable("auditoria_roles");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.AdministradorId).HasColumnName("administrador_id");
        builder.Property(c => c.UsuarioAfectadoId).HasColumnName("usuario_afectado_id");
        builder.Property(c => c.RolAnterior).HasColumnName("rol_anterior").HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.RolNuevo).HasColumnName("rol_nuevo").HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.OcurrioEn).HasColumnName("ocurrio_en");

        builder.HasIndex(c => c.OcurrioEn).HasDatabaseName("ix_auditoria_roles_ocurrio_en");
        builder.HasIndex(c => c.UsuarioAfectadoId).HasDatabaseName("ix_auditoria_roles_usuario_afectado_id");
    }
}
