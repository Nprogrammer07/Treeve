# Contenido de los mensajes de apoyo · Cómo escribirlo

Guía para quien escribe o revisa los fragmentos (HU-06a-1 y HU-06a-3) y para la revisión psicológica. La decisión de fondo está en [ADR-001](../adr/ADR-001-mensajes-de-apoyo-grafo-de-composicion.md).

Todo el contenido vive en `src/Infrastructure/Treeve.Infrastructure/MensajesApoyo/Contenido/`. No hace falta tocar código para agregar o corregir frases.

| Archivo | Qué contiene |
|---|---|
| `fragmentos.json` | Las frases de las 5 ranuras |
| `temas.json` | Palabras clave de cada tema |
| `crisis.json` | Frases de riesgo, excepciones y el mensaje fijo de crisis |

## 1. Cómo se arma un mensaje

Un mensaje son 5 fragmentos, uno por ranura y en este orden: **saludo → validación → reflejo → contraste → puente**. En cada ranura el motor toma los fragmentos que encajan con el desahogo, descarta los usados en las 5 respuestas anteriores y prefiere el más específico.

Ejemplo (tristeza, habla de su mamá, intensidad media):

> Hola, Nico. Lo que estás sintiendo tiene todo el sentido. Cuando algo en casa pesa, pesa en todo lo demás. No tienes que resolverlo hoy; basta con haberlo soltado aquí. Tu árbol recibió estas palabras como lluvia suave.

## 2. Formato de un fragmento

```json
{ "id": "TRI-REF-07", "ranura": "reflejo", "emocion": "tristeza", "temas": ["familia"], "intensidad": ["media", "alta"], "peso": 2, "texto": "Cuando algo en casa pesa, pesa en todo lo demás." }
```

| Campo | Obligatorio | Valores |
|---|---|---|
| `id` | Sí | `EMO-RAN-NN`. EMO: `TRI`, `RAB`, `MIE`, `DUD`, `FEL` o `GEN` (cualquier emoción). RAN: `SAL`, `VAL`, `REF`, `CON`, `PUE`. NN: dos dígitos. Debe coincidir con `emocion` y `ranura` |
| `ranura` | Sí | `saludo`, `validación`, `reflejo`, `contraste`, `puente` |
| `emocion` | No | `tristeza`, `rabia`, `miedo`, `duda`, `felicidad`. Sin él, sirve para todas (id `GEN-…`) |
| `temas` | No | `soledad`, `malestar`, `trabajo`, `estudio`, `familia`, `pareja`, `amistad`, `salud`, `dinero`. Sin él, sirve para cualquier tema |
| `intensidad` | No | `baja`, `media`, `alta`. Sin él, sirve para cualquier intensidad |
| `peso` | No | 1 a 10 (por defecto 1). Más peso, más probable frente a otros igual de específicos |
| `texto` | Sí | Oración completa, hasta 300 caracteres |

Entre más etiquetas, más específico: si encaja, se prefiere sobre uno general.

## 3. Reglas del texto

- **Oración completa:** empieza con mayúscula (o `¿`, `¡`, `{apodo}`) y termina en punto, `!` o `?`. Así encaja con cualquier vecino.
- **Ortografía completa**, con tildes y signos de apertura.
- **El saludo nombra a la persona** con `{apodo}`, el único marcador permitido.
- **Validar antes de animar:** nada de positividad tóxica ("¡Anímate, no es para tanto!").
- **Reflejar sin citar:** el reflejo muestra que se entendió el tema, nunca repite palabras del desahogo.
- **Sin consejos médicos ni diagnósticos**, y sin fingir que escribe una persona ("te leo", "me alegra").
- **Lenguaje neutro en género:** "nada te obliga", no "no estás obligado".
- **Metáfora del puente por emoción:** tristeza = lluvia; rabia = tormenta que pasa; duda = niebla que se levanta; miedo = raíces que sostienen; felicidad = sol.
- **Mínimo por emoción y ranura:** 8 fragmentos generales (sin tema ni intensidad), como pide HU-06. Así nunca se repite uno de las 5 respuestas anteriores. Los saludos `GEN` cuentan para todas las emociones.

## 4. Temas (`temas.json`)

Palabras o frases por tema, escritas con ortografía normal: al comparar se ignoran tildes y mayúsculas, así "mamá" también encuentra "mama". Un `*` al final acepta cualquier terminación: `trabaj*` encuentra "trabajo", "trabajando" y "trabajadora". Cuidado con los comodines muy cortos: `novi*` encontraría "noviembre".

### Combinar la emoción con lo que escribe la persona

La emoción elegida marca el tono base, y las palabras clave del texto lo complementan: un fragmento con `emocion` y `temas` (por ejemplo, `felicidad` + `soledad`) vale 3 puntos de especificidad y le gana a uno solo de felicidad, que vale 1. Así, quien elige Felicidad pero escribe que se siente sola o solo no recibe un mensaje que celebra.

- **Soledad y malestar** son los temas pensados para esas combinaciones. Hoy tienen fragmentos de `felicidad` en validación, reflejo y contraste, y reflejos `GEN` para cualquier emoción.
- **Mínimo de 6 por combinación y ranura** (5 respuestas sin repetir + 1). Con menos, al agotarse los propios el motor volvería a los fragmentos festivos. `ContenidoDeMensajesTests` lo comprueba.
- **Tono:** reconocer sin celebrar y sin asumir. Nada de "qué bonito" ni "qué lástima"; sin adjetivos de género ("sola", "contento") ni consejos clínicos.
- **Las palabras sueltas no sirven.** "solo" también es "solamente" y "mal" aparece en "no estuvo mal": por eso las frases piden contexto ("me siento solo", "estoy triste"). `solo*` o `sol*` estarían mal, porque encontrarían "solucionando".
- **Sin negaciones:** "ya no me siento solo" también activa el tema. El mensaje de esa combinación debe sonar bien aunque se active por error.
- Si un texto empata entre un tema de siempre y soledad o malestar, gana soledad o malestar (van primero en `Tema`).

#### Cuando el texto contradice la emoción (`contradice`)

Sirve para Felicidad, Tristeza, Rabia y Miedo. `Senales.Contradice` es verdadera si el tono del tema detectado es opuesto al de la emoción: Felicidad con soledad o malestar, o Tristeza, Rabia o Miedo con alegría ("Hoy me siento feliz"). `Duda` es neutra y nunca contradice.

- Un fragmento con `"contradice": true` solo encaja cuando hay contradicción, vale 2 puntos de especificidad y no cuenta como fragmento general. Por eso, en ese caso, le gana al de la emoción sola.
- Hoy son fragmentos `GEN` (para cualquier emoción) en validación, reflejo y contraste: mínimo 6 por ranura. `ContenidoDeMensajesTests` lo comprueba.
- Redacción neutra: no celebrar y no tratar lo escrito como algo malo. Reconocer lo que la persona dijo y que las emociones se mezclan.
- El tema `alegria` usa frases con contexto ("me siento feliz", "estoy muy bien"). Las negadas ("no me siento feliz", "no estoy bien") están en `malestar`, que gana los empates.
- Límites: los puentes siguen siendo propios de la emoción elegida, y con Duda un texto de certeza ("lo entiendo todo") no se detecta como contradicción.

## 5. Crisis (`crisis.json`)

- `frases`: frases de riesgo agrupadas por categoría. Basta una para responder con el mensaje fijo.
- `excepciones`: expresiones comunes que se parecen pero no son de riesgo ("morir* de risa", "mat* estudiando"). Se descartan antes de buscar.
- `mensaje`: el mensaje fijo. **Sugiere** una línea de atención; nunca redirige ni bloquea.
- **Ante la duda, se sugiere la línea:** una sugerencia de más es amable; una de menos puede ser grave.
- **Las líneas de ayuda no se inventan.** El mensaje lleva `TODO: verificar líneas de ayuda de Colombia` hasta que el equipo las confirme.

## 6. Cómo comprobar el contenido

```bash
dotnet test tests/Treeve.Infrastructure.Tests
```

`ContenidoDeMensajesTests` falla si un fragmento está mal escrito (id, marcador, puntuación), si una emoción no tiene al menos 8 fragmentos generales por ranura, si una respuesta repite fragmentos de las 5 anteriores, si Felicidad con un texto de soledad o malestar vuelve a celebrar o si la regla de crisis deja de reconocer los ejemplos. Para probar una frase de crisis nueva, agrégala como ejemplo en esa prueba.
