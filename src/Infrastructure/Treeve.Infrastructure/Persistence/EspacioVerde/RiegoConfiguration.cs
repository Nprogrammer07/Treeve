using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Treeve.Domain.EspacioVerde;
using Treeve.Domain.Identidad;

namespace Treeve.Infrastructure.Persistence.EspacioVerde;

public sealed class RiegoConfiguration : IEntityTypeConfiguration<Riego>
{
    public void Configure(EntityTypeBuilder<Riego> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // HU-07a: un riego por desahogo. La llave es el id de la nota: un evento repetido no puede contar dos veces.
        // Solo ids y la fecha; el estado del lote se calcula a partir de cuántos hay (ReglaDeCrecimiento).
        builder.ToTable("riegos");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id).HasColumnName("nota_id").ValueGeneratedNever();
        builder.Property(r => r.UsuarioId).HasColumnName("usuario_id");
        builder.Property(r => r.OcurrioEn).HasColumnName("ocurrio_en");

        builder.HasIndex(r => r.UsuarioId).HasDatabaseName("ix_riegos_usuario_id");

        builder.HasOne<Usuario>().WithMany().HasForeignKey(r => r.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
