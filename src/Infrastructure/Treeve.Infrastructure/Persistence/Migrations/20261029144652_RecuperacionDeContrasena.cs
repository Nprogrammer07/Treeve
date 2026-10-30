using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecuperacionDeContrasena : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "recuperaciones_contrasena",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    creada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expira_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    usada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recuperaciones_contrasena", x => x.id);
                    table.ForeignKey(
                        name: "FK_recuperaciones_contrasena_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_recuperaciones_contrasena_usuario_id_creada_en",
                schema: "treeve",
                table: "recuperaciones_contrasena",
                columns: new[] { "usuario_id", "creada_en" });

            migrationBuilder.CreateIndex(
                name: "ux_recuperaciones_contrasena_token_hash",
                schema: "treeve",
                table: "recuperaciones_contrasena",
                column: "token_hash",
                unique: true);

            migrationBuilder.ProtegerDeLaApiPublica("recuperaciones_contrasena");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "recuperaciones_contrasena",
                schema: "treeve");
        }
    }
}