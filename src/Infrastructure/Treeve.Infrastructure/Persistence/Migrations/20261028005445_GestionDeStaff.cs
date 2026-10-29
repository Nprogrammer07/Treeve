using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GestionDeStaff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auditoria_roles",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    administrador_id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_afectado_id = table.Column<Guid>(type: "uuid", nullable: false),
                    rol_anterior = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    rol_nuevo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ocurrio_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoria_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notificaciones",
                schema: "treeve",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    evento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    creada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    leida_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notificaciones", x => x.id);
                    table.ForeignKey(
                        name: "FK_notificaciones_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_auditoria_roles_ocurrio_en",
                schema: "treeve",
                table: "auditoria_roles",
                column: "ocurrio_en");

            migrationBuilder.CreateIndex(
                name: "ix_auditoria_roles_usuario_afectado_id",
                schema: "treeve",
                table: "auditoria_roles",
                column: "usuario_afectado_id");

            migrationBuilder.CreateIndex(
                name: "ix_notificaciones_usuario_id_creada_en",
                schema: "treeve",
                table: "notificaciones",
                columns: new[] { "usuario_id", "creada_en" });

            migrationBuilder.CreateIndex(
                name: "ux_notificaciones_evento_id",
                schema: "treeve",
                table: "notificaciones",
                column: "evento_id",
                unique: true);

            migrationBuilder.ProtegerDeLaApiPublica("auditoria_roles");
            migrationBuilder.ProtegerDeLaApiPublica("notificaciones");

            // ADR-006: los dos logs de auditoría solo admiten agregar filas (HU-12 pide un log inmutable).
            migrationBuilder.HacerInmutable("auditoria_roles");
            migrationBuilder.HacerInmutable("auditoria_accesos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.QuitarInmutabilidad("auditoria_accesos");

            migrationBuilder.DropTable(
                name: "auditoria_roles",
                schema: "treeve");

            migrationBuilder.DropTable(
                name: "notificaciones",
                schema: "treeve");

            migrationBuilder.EliminarFuncionDeSoloAgregar();
        }
    }
}
