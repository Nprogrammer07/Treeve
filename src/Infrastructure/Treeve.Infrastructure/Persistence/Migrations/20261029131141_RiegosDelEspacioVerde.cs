using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RiegosDelEspacioVerde : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "riegos",
                schema: "treeve",
                columns: table => new
                {
                    nota_id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ocurrio_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_riegos", x => x.nota_id);
                    table.ForeignKey(
                        name: "FK_riegos_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_riegos_usuario_id",
                schema: "treeve",
                table: "riegos",
                column: "usuario_id");

            migrationBuilder.ProtegerDeLaApiPublica("riegos");

            // Los desahogos guardados antes de HU-07a también riegan el lote: nadie empieza de cero.
            migrationBuilder.Sql("""
                INSERT INTO treeve.riegos (nota_id, usuario_id, ocurrio_en)
                SELECT id, usuario_id, creada_en FROM treeve.desahogos
                ON CONFLICT (nota_id) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "riegos",
                schema: "treeve");
        }
    }
}
