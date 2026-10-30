using Treeve.Domain.Comun;
using Treeve.Domain.Notificaciones;
using Treeve.Domain.Sugerencias;

namespace Treeve.Domain.Tests.Sugerencias;

public class GestionDeSugerenciaTests
{
    private static readonly DateTimeOffset Enviada = new(2026, 10, 26, 15, 0, 0, TimeSpan.FromHours(-5));
    private static readonly DateTimeOffset Ahora = Enviada.AddDays(2);

    private readonly Guid autora = Guid.NewGuid();
    private readonly Guid staff = Guid.NewGuid();
    private readonly Sugerencia sugerencia;

    public GestionDeSugerenciaTests()
    {
        sugerencia = Sugerencia.Enviar(autora, TextoSugerencia.Crear("Modo oscuro"), Enviada);
    }

    private static ComentarioDelStaff Comentario(string texto) => ComentarioDelStaff.Crear(texto);

    [Fact]
    public void Una_sugerencia_nueva_no_tiene_comentario_ni_gestion()
    {
        Assert.Null(sugerencia.Comentario);
        Assert.Null(sugerencia.GestionadaPor);
        Assert.Null(sugerencia.GestionadaEn);
    }

    [Fact]
    public void Cambiar_el_estado_registra_quien_y_cuando_y_produce_el_evento()
    {
        var evento = sugerencia.Gestionar(staff, EstadoSugerencia.EnRevision, null, Ahora);

        Assert.Equal(EstadoSugerencia.EnRevision, sugerencia.Estado);
        Assert.Equal(staff, sugerencia.GestionadaPor);
        Assert.Equal(Ahora, sugerencia.GestionadaEn);

        Assert.NotNull(evento);
        Assert.Equal(sugerencia.Id, evento.SugerenciaId);
        Assert.Equal(autora, evento.UsuarioId); // avisa a quien sugirió, no a quien gestionó
        Assert.Equal(EstadoSugerencia.EnRevision, evento.Estado);
        Assert.True(evento.CambioElEstado);
        Assert.False(evento.CambioElComentario);
        Assert.Equal(Ahora, evento.Fecha);
    }

    [Fact]
    public void Comentar_sin_cambiar_el_estado()
    {
        var evento = sugerencia.Gestionar(staff, null, Comentario("  Lo vamos a evaluar.  "), Ahora);

        Assert.Equal("Lo vamos a evaluar.", sugerencia.Comentario);
        Assert.Equal(EstadoSugerencia.Pendiente, sugerencia.Estado);
        Assert.NotNull(evento);
        Assert.False(evento.CambioElEstado);
        Assert.True(evento.CambioElComentario);
    }

    [Fact]
    public void Un_comentario_nuevo_reemplaza_al_anterior()
    {
        sugerencia.Gestionar(staff, null, Comentario("Lo vamos a evaluar."), Ahora);
        sugerencia.Gestionar(staff, EstadoSugerencia.Implementada, Comentario("Ya está disponible."), Ahora.AddDays(1));

        Assert.Equal("Ya está disponible.", sugerencia.Comentario);
        Assert.Equal(EstadoSugerencia.Implementada, sugerencia.Estado);
        Assert.Equal(Ahora.AddDays(1), sugerencia.GestionadaEn);
    }

    [Fact]
    public void Un_comentario_vacio_quita_el_anterior()
    {
        sugerencia.Gestionar(staff, null, Comentario("Lo vamos a evaluar."), Ahora);

        var evento = sugerencia.Gestionar(staff, null, Comentario("   "), Ahora.AddHours(1));

        Assert.Null(sugerencia.Comentario);
        Assert.NotNull(evento);
        Assert.True(evento.CambioElComentario);
    }

    [Theory]
    [InlineData(EstadoSugerencia.Implementada, EstadoSugerencia.Pendiente)]
    [InlineData(EstadoSugerencia.Rechazada, EstadoSugerencia.EnRevision)]
    [InlineData(EstadoSugerencia.Rechazada, EstadoSugerencia.Implementada)]
    public void Los_cambios_de_estado_son_libres_para_poder_corregir(EstadoSugerencia primero, EstadoSugerencia despues)
    {
        sugerencia.Gestionar(staff, primero, null, Ahora);

        Assert.NotNull(sugerencia.Gestionar(staff, despues, null, Ahora.AddHours(1)));
        Assert.Equal(despues, sugerencia.Estado);
    }

    [Fact]
    public void Si_nada_cambia_no_registra_nada_ni_produce_evento()
    {
        sugerencia.Gestionar(staff, EstadoSugerencia.EnRevision, Comentario("Lo vamos a evaluar."), Ahora);
        var otraPersona = Guid.NewGuid();

        var evento = sugerencia.Gestionar(otraPersona, EstadoSugerencia.EnRevision, Comentario("Lo vamos a evaluar."), Ahora.AddDays(1));

        Assert.Null(evento);
        Assert.Equal(staff, sugerencia.GestionadaPor);
        Assert.Equal(Ahora, sugerencia.GestionadaEn);
    }

    [Fact]
    public void Quitar_un_comentario_que_no_existe_no_es_un_cambio()
    {
        Assert.Null(sugerencia.Gestionar(staff, null, Comentario(""), Ahora));
        Assert.Null(sugerencia.GestionadaEn);
    }

    [Fact]
    public void Exige_un_estado_o_un_comentario()
    {
        Assert.Throws<ExcepcionDeDominio>(() => sugerencia.Gestionar(staff, null, null, Ahora));
    }

    [Fact]
    public void Rechaza_un_estado_que_no_existe()
    {
        Assert.Throws<ExcepcionDeDominio>(() => sugerencia.Gestionar(staff, (EstadoSugerencia)99, null, Ahora));
        Assert.Equal(EstadoSugerencia.Pendiente, sugerencia.Estado);
    }

    [Fact]
    public void El_comentario_tiene_un_limite_de_caracteres()
    {
        Assert.NotNull(ComentarioDelStaff.Crear(new string('a', ComentarioDelStaff.LongitudMaxima)).Valor);
        Assert.Throws<ExcepcionDeDominio>(() => ComentarioDelStaff.Crear(new string('a', ComentarioDelStaff.LongitudMaxima + 1)));
    }

    [Fact]
    public void El_comentario_no_se_imprime()
    {
        Assert.DoesNotContain("secreto", ComentarioDelStaff.Crear("Dato secreto").ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void El_aviso_va_a_quien_sugirio_y_no_repite_el_comentario()
    {
        var evento = sugerencia.Gestionar(staff, EstadoSugerencia.Rechazada, Comentario("Ya existe en ajustes"), Ahora)!;

        var aviso = Notificacion.PorSugerenciaGestionada(evento);

        Assert.Equal(autora, aviso.UsuarioId);
        Assert.Equal(TipoDeNotificacion.SugerenciaRespondida, aviso.Tipo);
        Assert.Equal(evento.EventoId, aviso.EventoId);
        Assert.Equal(Ahora, aviso.CreadaEn);
        Assert.DoesNotContain("ajustes", aviso.Mensaje, StringComparison.Ordinal);
        Assert.DoesNotContain("Modo oscuro", aviso.Mensaje, StringComparison.Ordinal);
    }

    [Fact]
    public void Cada_gestion_produce_un_evento_distinto()
    {
        var primero = sugerencia.Gestionar(staff, EstadoSugerencia.EnRevision, null, Ahora)!;
        var segundo = sugerencia.Gestionar(staff, EstadoSugerencia.Implementada, null, Ahora.AddDays(1))!;

        Assert.NotEqual(primero.EventoId, segundo.EventoId);
    }
}
