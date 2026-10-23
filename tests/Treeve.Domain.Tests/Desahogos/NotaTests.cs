using Treeve.Domain.Comun;
using Treeve.Domain.Desahogos;

namespace Treeve.Domain.Tests.Desahogos;

public class NotaTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 23, 9, 30, 0, TimeSpan.FromHours(-5));
    private static readonly byte[] Cifrado = [1, 2, 3];

    [Fact]
    public void Asocia_la_emocion_la_persona_y_la_fecha()
    {
        var id = Guid.NewGuid();
        var persona = Guid.NewGuid();

        var nota = Nota.Crear(id, persona, Emocion.Miedo, Cifrado, Ahora);

        Assert.Equal(id, nota.Id);
        Assert.Equal(persona, nota.UsuarioId);
        Assert.Equal(Emocion.Miedo, nota.Emocion);
        Assert.Equal(Ahora, nota.CreadaEn);
        Assert.Equal(Cifrado, nota.TextoCifrado);
    }

    [Fact]
    public void Una_emocion_que_no_existe_no_es_valida()
    {
        Assert.Throws<ExcepcionDeDominio>(() => Nota.Crear(Guid.NewGuid(), Guid.NewGuid(), (Emocion)99, Cifrado, Ahora));
    }

    [Fact]
    public void Sin_texto_cifrado_no_hay_nota()
    {
        Assert.Throws<ArgumentException>(() => Nota.Crear(Guid.NewGuid(), Guid.NewGuid(), Emocion.Duda, [], Ahora));
    }

    [Fact]
    public void Solo_pertenece_a_su_duena()
    {
        var persona = Guid.NewGuid();
        var nota = Nota.Crear(Guid.NewGuid(), persona, Emocion.Rabia, Cifrado, Ahora);

        Assert.True(nota.PerteneceA(persona));
        Assert.False(nota.PerteneceA(Guid.NewGuid()));
    }

    [Fact]
    public void El_evento_lleva_solo_ids_emocion_y_fecha()
    {
        var nota = Nota.Crear(Guid.NewGuid(), Guid.NewGuid(), Emocion.Tristeza, Cifrado, Ahora);

        var evento = nota.Creada();

        Assert.Equal(nota.Id, evento.NotaId);
        Assert.Equal(nota.Id, evento.EventoId);
        Assert.Equal(nota.UsuarioId, evento.UsuarioId);
        Assert.Equal(Emocion.Tristeza, evento.Emocion);
        Assert.Equal(Ahora, evento.Fecha);
        Assert.Equal(evento, nota.Creada());
    }

    [Fact]
    public void Nunca_se_imprime()
    {
        Assert.Equal("[nota]", Nota.Crear(Guid.NewGuid(), Guid.NewGuid(), Emocion.Felicidad, Cifrado, Ahora).ToString());
    }
}
