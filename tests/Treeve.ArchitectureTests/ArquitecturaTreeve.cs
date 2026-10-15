using System.Reflection;
using ArchUnitNET.Domain;
using ArchUnitNET.Loader;
using Assembly = System.Reflection.Assembly;

namespace Treeve.ArchitectureTests;

/// <summary>
/// Carga una sola vez los ensamblados del backend y describe los anillos del Onion:
/// qué proyecto pertenece a cada anillo y en qué carpeta de src/ debe vivir.
/// </summary>
internal static class ArquitecturaTreeve
{
    public const string NombreSolucion = "Treeve.slnx";

    /// <summary>Proyecto → carpeta de su anillo. Un proyecto nuevo se agrega aquí a propósito.</summary>
    public static readonly IReadOnlyDictionary<string, string> CarpetaDeCadaProyecto = new Dictionary<string, string>
    {
        ["Treeve.Domain"] = "src/Core",
        ["Treeve.Domain.Services"] = "src/Core",
        ["Treeve.Application"] = "src/Core",
        ["Treeve.Infrastructure"] = "src/Infrastructure",
        ["Treeve.Api"] = "src/Presentation",
    };

    public static readonly IReadOnlyList<Assembly> Ensamblados = CargarEnsamblados();

    public static readonly Architecture Arquitectura =
        new ArchLoader().LoadAssemblies([.. Ensamblados]).Build();

    /// <summary>Raíz del repositorio (la carpeta que contiene la solución).</summary>
    public static string RaizRepositorio()
    {
        var carpeta = new DirectoryInfo(AppContext.BaseDirectory);
        while (carpeta is not null && !File.Exists(Path.Combine(carpeta.FullName, NombreSolucion)))
        {
            carpeta = carpeta.Parent;
        }

        return carpeta?.FullName
            ?? throw new InvalidOperationException($"No se encontró {NombreSolucion} subiendo desde {AppContext.BaseDirectory}.");
    }

    /// <summary>Proyectos .csproj bajo src/, sin entrar a node_modules, bin ni obj.</summary>
    public static IEnumerable<string> ProyectosDeSrc()
    {
        var pendientes = new Stack<DirectoryInfo>([new DirectoryInfo(Path.Combine(RaizRepositorio(), "src"))]);
        while (pendientes.TryPop(out var carpeta))
        {
            foreach (var proyecto in carpeta.EnumerateFiles("*.csproj"))
            {
                yield return proyecto.FullName;
            }

            foreach (var subcarpeta in carpeta.EnumerateDirectories())
            {
                if (subcarpeta.Name is not ("node_modules" or "bin" or "obj"))
                {
                    pendientes.Push(subcarpeta);
                }
            }
        }
    }

    private static List<Assembly> CargarEnsamblados()
    {
        var propio = typeof(ArquitecturaTreeve).Assembly.GetName().Name;

        return Directory.GetFiles(AppContext.BaseDirectory, "Treeve.*.dll")
            .Select(AssemblyName.GetAssemblyName)
            .Where(nombre => nombre.Name != propio && !nombre.Name!.EndsWith(".Tests", StringComparison.Ordinal))
            .Select(Assembly.Load)
            .ToList();
    }
}
