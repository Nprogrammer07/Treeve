using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Treeve.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// HU-02 / HU-03a: los datos de acceso pasan a su propia tabla (credenciales, 1:1 con usuarios) y el motivo
    /// de registro pasa a guardarse cifrado. Escrita a mano a partir de la generada por EF Core: primero se
    /// copian los hashes y luego se borran las columnas, para no dejar a ningún usuario sin contraseña.
    /// </summary>
    public partial class CredencialesYMotivoCifrado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "credenciales",
                schema: "treeve",
                columns: table => new
                {
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hash_de_contrasena = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    intentos_fallidos = table.Column<int>(type: "integer", nullable: false),
                    bloqueado_hasta = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    actualizada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credenciales", x => x.usuario_id);
                    table.ForeignKey(
                        name: "FK_credenciales_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalSchema: "treeve",
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO treeve.credenciales (usuario_id, hash_de_contrasena, intentos_fallidos, bloqueado_hasta, actualizada_en)
                SELECT id, hash_de_contrasena, intentos_fallidos, bloqueado_hasta, creado_en
                FROM treeve.usuarios;
                """);

            migrationBuilder.ProtegerDeLaApiPublica("credenciales");

            migrationBuilder.DropColumn(name: "hash_de_contrasena", schema: "treeve", table: "usuarios");
            migrationBuilder.DropColumn(name: "intentos_fallidos", schema: "treeve", table: "usuarios");
            migrationBuilder.DropColumn(name: "bloqueado_hasta", schema: "treeve", table: "usuarios");

            // Los motivos ya guardados en claro no se pueden cifrar desde SQL (la llave no vive en la base de
            // datos, ADR-002) y solo existen en la base de desarrollo, como datos de prueba: se descartan.
            migrationBuilder.DropColumn(name: "motivo_de_registro", schema: "treeve", table: "usuarios");

            migrationBuilder.AddColumn<byte[]>(
                name: "motivo_de_registro_cifrado",
                schema: "treeve",
                table: "usuarios",
                type: "bytea",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "hash_de_contrasena",
                schema: "treeve",
                table: "usuarios",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "intentos_fallidos",
                schema: "treeve",
                table: "usuarios",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "bloqueado_hasta",
                schema: "treeve",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE treeve.usuarios u
                SET hash_de_contrasena = c.hash_de_contrasena,
                    intentos_fallidos = c.intentos_fallidos,
                    bloqueado_hasta = c.bloqueado_hasta
                FROM treeve.credenciales c
                WHERE c.usuario_id = u.id;
                """);

            migrationBuilder.DropTable(name: "credenciales", schema: "treeve");

            // El motivo cifrado no se puede volver a texto plano desde SQL: se descarta.
            migrationBuilder.DropColumn(name: "motivo_de_registro_cifrado", schema: "treeve", table: "usuarios");

            migrationBuilder.AddColumn<string>(
                name: "motivo_de_registro",
                schema: "treeve",
                table: "usuarios",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }
    }
}
