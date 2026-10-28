using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.Identidad;
using Treeve.Domain.Notificaciones;

namespace Treeve.Infrastructure.Persistence.Notificaciones;

public sealed class NotificacionConfiguration : IEntityTypeConfiguration<Notificacion>
{
    public void Configure(EntityTypeBuilder<Notificacion> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // HU-12: avisos dentro de la aplicación. El texto no se guarda: sale del tipo (Notificacion.Mensaje).
        builder.ToTable("notificaciones");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id).HasColumnName("id");
        builder.Property(n => n.UsuarioId).HasColumnName("usuario_id");
        builder.Property(n => n.Tipo).HasColumnName("tipo").HasConversion<string>().HasMaxLength(30);
        builder.Property(n => n.EventoId).HasColumnName("evento_id");
        builder.Property(n => n.CreadaEn).HasColumnName("creada_en");
        builder.Property(n => n.LeidaEn).HasColumnName("leida_en");

        builder.Ignore(n => n.Leida);
        builder.Ignore(n => n.Mensaje);

        // Idempotencia del manejador (TEC-03): un evento produce como mucho una notificación.
        builder.HasIndex(n => n.EventoId).IsUnique().HasDatabaseName("ux_notificaciones_evento_id");
        builder.HasIndex(n => new { n.UsuarioId, n.CreadaEn }).HasDatabaseName("ix_notificaciones_usuario_id_creada_en");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(n => n.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
