using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HistorialRespuestas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "historial_respuestas",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fragmentos_cifrados = table.Column<byte[]>(type: "bytea", nullable: false),
                    creada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_historial_respuestas", x => x.id);
                    table.ForeignKey(
                        name: "FK_historial_respuestas_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_historial_respuestas_usuario_id_creada_en",
                schema: "treeve",
                table: "historial_respuestas",
                columns: new[] { "usuario_id", "creada_en" });

            migrationBuilder.ProtegerDeLaApiPublica("historial_respuestas");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "historial_respuestas",
                schema: "treeve");
        }
    }
}
