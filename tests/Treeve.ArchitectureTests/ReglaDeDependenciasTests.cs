using ArchUnitNET.xUnit;
using static ArchUnitNET.Fluent.ArchRuleDefinition;
using static Treeve.ArchitectureTests.ArquitecturaTreeve;

namespace Treeve.ArchitectureTests;

/// <summary>
/// Regla de dependencias de la Onion Architecture (ADR-004): todas las dependencias apuntan
/// hacia el centro. Dominio ← Servicios de dominio ← Aplicación ← Infraestructura y Presentación.
/// </summary>
public class ReglaDeDependenciasTests
{
    // Anillos, identificados por el nombre del ensamblado.
    private const string ModeloDeDominio = @"^Treeve\.Domain(,|$)";
    private const string ServiciosDeDominio = @"^Treeve\.Domain\.Services(,|$)";
    private const string ServiciosDeAplicacion = @"^Treeve\.Application(,|$)";
    private const string Infraestructura = @"^Treeve\.Infrastructure(,|$)";
    private const string Presentacion = @"^Treeve\.Api(,|$)";
    private const string Nucleo = $"{ModeloDeDominio}|{ServiciosDeDominio}|{ServiciosDeAplicacion}";

    /// <summary>Frameworks, ORM, SDK de Supabase, HTTP y acceso a datos: nada de esto entra al núcleo.</summary>
    private const string Frameworks =
        @"^(Microsoft\.AspNetCore|Microsoft\.EntityFrameworkCore|Microsoft\.Extensions|Npgsql|Supabase|Dapper" +
        @"|System\.Net\.Http|System\.Net\.Sockets|System\.Net\.WebSockets|System\.Data)(\.|$)";

    private const string AccesoADatos = @"^(Microsoft\.EntityFrameworkCore|Npgsql|Supabase|Dapper|System\.Data)(\.|$)";

    private const string PresentacionWeb = @"^Microsoft\.AspNetCore\.(Http|Routing|Mvc|Builder)(\.|$)";

    [Fact]
    public void El_modelo_de_dominio_no_depende_de_ningun_otro_anillo()
    {
        Types().That().ResideInAssemblyMatching(ModeloDeDominio)
            .Should().NotDependOnAny(Types().That().ResideInAssemblyMatching(
                $"{ServiciosDeDominio}|{ServiciosDeAplicacion}|{Infraestructura}|{Presentacion}"))
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }

    [Fact]
    public void Los_servicios_de_dominio_solo_dependen_del_modelo_de_dominio()
    {
        Types().That().ResideInAssemblyMatching(ServiciosDeDominio)
            .Should().NotDependOnAny(Types().That().ResideInAssemblyMatching(
                $"{ServiciosDeAplicacion}|{Infraestructura}|{Presentacion}"))
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }

    [Fact]
    public void Los_servicios_de_aplicacion_no_dependen_de_los_anillos_externos()
    {
        Types().That().ResideInAssemblyMatching(ServiciosDeAplicacion)
            .Should().NotDependOnAny(Types().That().ResideInAssemblyMatching($"{Infraestructura}|{Presentacion}"))
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }

    [Fact]
    public void El_nucleo_no_depende_de_frameworks()
    {
        Types().That().ResideInAssemblyMatching(Nucleo)
            .Should().NotDependOnAny(Types(true).That().ResideInNamespaceMatching(Frameworks))
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }

    [Fact]
    public void La_infraestructura_no_depende_de_la_presentacion()
    {
        Types().That().ResideInAssemblyMatching(Infraestructura)
            .Should().NotDependOnAny(Types(true).That().ResideInAssemblyMatching(Presentacion)
                .Or().ResideInNamespaceMatching(PresentacionWeb))
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }

    [Fact]
    public void La_presentacion_solo_usa_infraestructura_para_componer_dependencias()
    {
        // Los endpoints llaman casos de uso; nunca un repositorio ni la base de datos.
        // Solo Composition/ (y Program.cs) conocen Treeve.Infrastructure.
        Types().That().ResideInAssemblyMatching(Presentacion)
            .And().ResideInNamespaceMatching(@"^Treeve\.Api(?!\.Composition(\.|$))(\.|$)")
            .Should().NotDependOnAny(Types(true).That().ResideInAssemblyMatching(Infraestructura)
                .Or().ResideInNamespaceMatching(AccesoADatos))
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }

    [Fact]
    public void Las_interfaces_de_repositorio_viven_en_los_servicios_de_dominio()
    {
        Interfaces().That().HaveNameStartingWith("IRepositorio")
            .Should().ResideInAssemblyMatching(ServiciosDeDominio)
            .WithoutRequiringPositiveResults()
            .Check(Arquitectura);
    }
}
