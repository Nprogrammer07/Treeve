using System.Diagnostics;
using static Treeve.ArchitectureTests.ArquitecturaTreeve;

namespace Treeve.ArchitectureTests;

/// <summary>
/// Lo que las reglas de dependencias no ven: código fuera de los anillos o escrito en otro
/// lenguaje. El stack es C# / .NET en el backend y React + TypeScript en el frontend (ADR-003);
/// todo el backend debe vivir en los proyectos C# de los anillos para que las reglas del Onion
/// lo revisen. Se revisan los archivos de git (versionados o nuevos no ignorados), así que
/// bin/, obj/ y node_modules/ no cuentan.
/// </summary>
public class EstructuraDelRepositorioTests
{
    private const string Web = "src/Presentation/Treeve.Web/";
    private const string Despliegue = "deploy/";

    /// <summary>ADR-001: el contenido de los mensajes de apoyo son datos (JSON versionado), no código.</summary>
    private const string ContenidoDeMensajes = "src/Infrastructure/Treeve.Infrastructure/MensajesApoyo/Contenido/";

    private static readonly string[] CarpetasDelBackend =
        ["src/Core/", "src/Infrastructure/", "src/Presentation/Treeve.Api/", "tests/"];

    private static readonly IReadOnlyList<string> Archivos = ArchivosDelRepositorio();

    [Fact]
    public void Solo_existen_las_carpetas_de_la_arquitectura()
    {
        string[] archivosDeLaRaiz =
        [
            ".editorconfig", ".gitattributes", ".gitignore", "CLAUDE.md", "README.md",
            "Treeve.slnx", "global.json", "Directory.Build.props", "Directory.Packages.props",
        ];
        string[] carpetas = [.. CarpetasDelBackend, Web, Despliegue, "docs/", ".github/"];

        var fueraDeLugar = Archivos
            .Where(a => !archivosDeLaRaiz.Contains(a) && !carpetas.Any(c => a.StartsWith(c, StringComparison.Ordinal)))
            .ToList();

        SinArchivos(fueraDeLugar,
            "Hay archivos fuera de las carpetas de la arquitectura (src/Core, src/Infrastructure, src/Presentation, tests, deploy, docs). " +
            "El backend va en los proyectos C# de los anillos; un cambio de estructura se propone primero como ADR.");
    }

    [Fact]
    public void El_backend_esta_escrito_solo_en_CSharp()
    {
        string[] extensiones = [".cs", ".csproj", ".gitkeep"];

        var ajenos = Archivos
            .Where(a => CarpetasDelBackend.Any(c => a.StartsWith(c, StringComparison.Ordinal)))
            .Where(a => !extensiones.Contains(Path.GetExtension(a)) && !EsConfiguracionDeAspNet(Path.GetFileName(a)) && !EsContenidoDeMensajes(a))
            .ToList();

        SinArchivos(ajenos,
            "El backend solo admite C# (.cs y .csproj), la configuración de ASP.NET Core (ADR-003) " +
            $"y el contenido JSON de los mensajes de apoyo en {ContenidoDeMensajes} (ADR-001).");
    }

    [Fact]
    public void Todo_archivo_CSharp_pertenece_a_un_proyecto()
    {
        var carpetasDeProyectos = Archivos
            .Where(a => a.EndsWith(".csproj", StringComparison.Ordinal))
            .Select(a => a[..(a.LastIndexOf('/') + 1)])
            .ToList();

        var huerfanos = Archivos
            .Where(a => a.EndsWith(".cs", StringComparison.Ordinal))
            .Where(a => !carpetasDeProyectos.Any(p => a.StartsWith(p, StringComparison.Ordinal)))
            .ToList();

        SinArchivos(huerfanos, "Estos .cs no están dentro de un proyecto: no se compilan y ninguna regla del Onion los revisa.");
    }

    [Fact]
    public void El_frontend_esta_escrito_solo_en_TypeScript()
    {
        string[] codigo = [".ts", ".tsx", ".css"];
        string[] recursos = [".svg", ".png", ".webp", ".jpg", ".json", ".ogg", ".mp3", ".woff2", ".gitkeep"];
        string[] configuracion =
        [
            ".dependency-cruiser.cjs", ".env.example", ".gitignore", ".nvmrc", ".oxlintrc.json", "README.md",
            "index.html", "package-lock.json", "package.json", "tsconfig.app.json", "tsconfig.json",
            "tsconfig.node.json", "vite.config.ts",
        ];

        var ajenos = Archivos
            .Where(a => a.StartsWith(Web, StringComparison.Ordinal))
            .Select(a => a[Web.Length..])
            .Where(a => a switch
            {
                _ when a.StartsWith("src/", StringComparison.Ordinal) =>
                    !codigo.Contains(Path.GetExtension(a)) && !recursos.Contains(Path.GetExtension(a)),
                _ when a.StartsWith("public/", StringComparison.Ordinal) => !recursos.Contains(Path.GetExtension(a)),
                _ => !configuracion.Contains(a),
            })
            .ToList();

        SinArchivos(ajenos,
            "El frontend solo admite TypeScript y CSS en src/, recursos en src/ o public/, y la configuración ya revisada (ADR-003).");
    }

    [Fact]
    public void Las_carpetas_de_apoyo_solo_contienen_lo_que_les_corresponde()
    {
        // Ninguna carpeta permitida es un comodín: no se pueden esquivar las demás reglas
        // dejando código o archivos de despliegue donde no van (p. ej. un Dockerfile en .github/).
        string[] documentos = [".md", ".png", ".svg", ".jpg", ".webp"];

        var ajenos = Archivos
            .Where(a => a switch
            {
                _ when a.StartsWith(".github/", StringComparison.Ordinal) => !EsConfiguracionDeGitHub(a[".github/".Length..]),
                _ when a.StartsWith(Despliegue, StringComparison.Ordinal) => a is not ("deploy/Dockerfile" or "deploy/README.md"),
                _ when a.StartsWith("docs/", StringComparison.Ordinal) => !documentos.Contains(Path.GetExtension(a)),
                _ => false,
            })
            .ToList();

        SinArchivos(ajenos,
            ".github/ solo admite CODEOWNERS, la plantilla de PR y los workflows; deploy/ solo el Dockerfile y su README; " +
            "docs/ solo documentos (.md e imágenes). Un archivo nuevo en estas carpetas lo habilita el arquitecto.");
    }

    private static void SinArchivos(List<string> archivos, string explicacion)
    {
        if (archivos.Count > 0)
        {
            Assert.Fail($"{explicacion}{Environment.NewLine}{string.Join(Environment.NewLine, archivos.Select(a => $"  - {a}"))}");
        }
    }

    private static bool EsConfiguracionDeGitHub(string ruta) =>
        ruta is "CODEOWNERS" or "pull_request_template.md" ||
        (ruta.StartsWith("workflows/", StringComparison.Ordinal) && ruta.Count(c => c == '/') == 1 &&
         ruta.EndsWith(".yml", StringComparison.Ordinal));

    private static bool EsContenidoDeMensajes(string ruta) =>
        ruta.StartsWith(ContenidoDeMensajes, StringComparison.Ordinal) &&
        !ruta[ContenidoDeMensajes.Length..].Contains('/', StringComparison.Ordinal) &&
        ruta.EndsWith(".json", StringComparison.Ordinal);

    private static bool EsConfiguracionDeAspNet(string archivo) =>
        archivo == "launchSettings.json" ||
        (archivo.StartsWith("appsettings", StringComparison.Ordinal) && archivo.EndsWith(".json", StringComparison.Ordinal));

    private static List<string> ArchivosDelRepositorio()
    {
        var inicio = new ProcessStartInfo("git", "ls-files -z --cached --others --exclude-standard")
        {
            WorkingDirectory = RaizRepositorio(),
            RedirectStandardOutput = true,
            UseShellExecute = false,
        };

        using var git = Process.Start(inicio)
            ?? throw new InvalidOperationException("No se pudo ejecutar git.");
        var salida = git.StandardOutput.ReadToEnd();
        git.WaitForExit();

        if (git.ExitCode != 0)
        {
            throw new InvalidOperationException($"git ls-files terminó con código {git.ExitCode}.");
        }

        return [.. salida.Split('\0', StringSplitOptions.RemoveEmptyEntries)];
    }
}
