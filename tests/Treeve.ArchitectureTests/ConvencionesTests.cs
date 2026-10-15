using static Treeve.ArchitectureTests.ArquitecturaTreeve;

namespace Treeve.ArchitectureTests;

/// <summary>
/// Las reglas de dependencias se aplican por nombre de ensamblado. Estas pruebas evitan que un
/// proyecto quede fuera de ellas: todo proyecto de src/ pertenece a un anillo conocido, vive en
/// la carpeta de ese anillo y está compuesto en el host.
/// </summary>
public class ConvencionesTests
{
    [Fact]
    public void Todo_proyecto_de_src_pertenece_a_un_anillo_y_vive_en_su_carpeta()
    {
        var raiz = RaizRepositorio();
        var fueraDeLugar = ProyectosDeSrc()
            .Select(ruta => (
                Nombre: Path.GetFileNameWithoutExtension(ruta),
                Carpeta: Path.GetRelativePath(raiz, Path.GetDirectoryName(Path.GetDirectoryName(ruta))!).Replace('\\', '/')))
            .Where(p => !CarpetaDeCadaProyecto.TryGetValue(p.Nombre, out var esperada) || esperada != p.Carpeta)
            .Select(p => $"{p.Nombre} (en {p.Carpeta})")
            .ToList();

        // Si falla: el proyecto no está en CarpetaDeCadaProyecto o está en la carpeta de otro anillo.
        Assert.Empty(fueraDeLugar);
    }

    [Fact]
    public void Todos_los_anillos_estan_bajo_las_reglas()
    {
        var cargados = Ensamblados.Select(a => a.GetName().Name).ToHashSet();
        var sinCargar = CarpetaDeCadaProyecto.Keys.Except(cargados).ToList();

        // Si falla: el proyecto no llega a Treeve.Api (falta una ProjectReference).
        Assert.Empty(sinCargar);
    }
}
