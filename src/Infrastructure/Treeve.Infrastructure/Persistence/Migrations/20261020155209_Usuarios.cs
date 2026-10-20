using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Usuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "treeve");

            migrationBuilder.CreateTable(
                name: "usuarios",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    nombre_completo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    apodo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    nombre_de_usuario = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    correo = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    motivo_de_registro = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    hash_de_contrasena = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sesiones",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    creada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expira_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sesiones", x => x.id);
                    table.ForeignKey(
                        name: "FK_sesiones_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_sesiones_usuario_id",
                schema: "treeve",
                table: "sesiones",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ux_sesiones_token_hash",
                schema: "treeve",
                table: "sesiones",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_usuarios_correo",
                schema: "treeve",
                table: "usuarios",
                column: "correo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_usuarios_nombre_de_usuario",
                schema: "treeve",
                table: "usuarios",
                column: "nombre_de_usuario",
                unique: true);

            migrationBuilder.ProtegerDeLaApiPublica("usuarios");
            migrationBuilder.ProtegerDeLaApiPublica("sesiones");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sesiones",
                schema: "treeve");

            migrationBuilder.DropTable(
                name: "usuarios",
                schema: "treeve");
        }
    }
}