using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GestionDeSugerencias : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "comentario_del_staff",
                schema: "treeve",
                table: "sugerencias",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "gestionada_en",
                schema: "treeve",
                table: "sugerencias",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "gestionada_por",
                schema: "treeve",
                table: "sugerencias",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_sugerencias_gestionada_por",
                schema: "treeve",
                table: "sugerencias",
                column: "gestionada_por");

            migrationBuilder.AddForeignKey(
                name: "FK_sugerencias_usuarios_gestionada_por",
                schema: "treeve",
                table: "sugerencias",
                column: "gestionada_por",
                principalSchema: "treeve",
                principalTable: "usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sugerencias_usuarios_gestionada_por",
                schema: "treeve",
                table: "sugerencias");

            migrationBuilder.DropIndex(
                name: "ix_sugerencias_gestionada_por",
                schema: "treeve",
                table: "sugerencias");

            migrationBuilder.DropColumn(
                name: "comentario_del_staff",
                schema: "treeve",
                table: "sugerencias");

            migrationBuilder.DropColumn(
                name: "gestionada_en",
                schema: "treeve",
                table: "sugerencias");

            migrationBuilder.DropColumn(
                name: "gestionada_por",
                schema: "treeve",
                table: "sugerencias");
        }
    }
}
