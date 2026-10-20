using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BloqueoDeCuenta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "bloqueado_hasta",
                schema: "treeve",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "intentos_fallidos",
                schema: "treeve",
                table: "usuarios",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "bloqueado_hasta",
                schema: "treeve",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "intentos_fallidos",
                schema: "treeve",
                table: "usuarios");
        }
    }
}
