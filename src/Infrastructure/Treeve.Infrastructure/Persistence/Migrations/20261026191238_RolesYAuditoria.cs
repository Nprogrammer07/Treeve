using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RolesYAuditoria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "rol",
                schema: "treeve",
                table: "usuarios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Usuario");

            migrationBuilder.CreateTable(
                name: "auditoria_accesos",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ocurrio_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    recurso = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    rol_requerido = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoria_accesos", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_auditoria_accesos_ocurrio_en",
                schema: "treeve",
                table: "auditoria_accesos",
                column: "ocurrio_en");

            migrationBuilder.ProtegerDeLaApiPublica("auditoria_accesos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditoria_accesos",
                schema: "treeve");

            migrationBuilder.DropColumn(
                name: "rol",
                schema: "treeve",
                table: "usuarios");
        }
    }
}