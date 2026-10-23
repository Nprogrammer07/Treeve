using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Desahogos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "desahogos",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    emocion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    texto_cifrado = table.Column<byte[]>(type: "bytea", nullable: false),
                    creada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_desahogos", x => x.id);
                    table.ForeignKey(
                        name: "FK_desahogos_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_desahogos_usuario_id_creada_en",
                schema: "treeve",
                table: "desahogos",
                columns: new[] { "usuario_id", "creada_en" });

            migrationBuilder.ProtegerDeLaApiPublica("desahogos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "desahogos",
                schema: "treeve");
        }
    }
}