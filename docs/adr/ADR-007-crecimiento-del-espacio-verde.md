# ADR-007 · Crecimiento del espacio verde

- **Estado:** Aceptado (2026-10-29). Nicolás eligió los componentes del lote y el ritmo de crecimiento.
- **Fecha:** 2026-10-29
- **Decisores:** Nicolás (arquitecto y PO)
- **Historias relacionadas:** HU-07a, HU-07b, TEC-03, HU-06a-2

## Contexto

HU-07 pide que cada desahogo aumente la nutrición del lote, con un umbral configurable (cada X desahogos) que desbloquea una nueva etapa, y que el espacio verde se pueda ver en cualquier momento. El evento `NotaCreada` (TEC-03) ya se publica al guardar cada desahogo. La escena de HU-07b ya dibuja el árbol en cuatro etapas, con la etapa fijada a mano mientras faltaba esta lógica.

## Decisión

1. **Componentes y ritmo.** El lote tiene tres componentes: **árbol**, **flores** y **bosque**, cada uno con 4 niveles. El árbol pasa por brote, tallo, flor y árbol adulto. Cada **3 desahogos** crece **un solo** componente, un nivel, **por turnos**: árbol, flores, bosque, y de nuevo el árbol. Nunca crecen todos a la vez. Con 27 desahogos el lote queda completo. El umbral se configura con `EspacioVerde:DesahogosPorCrecimiento` (por defecto 3).
2. **El estado se calcula, no se guarda.** Cada desahogo deja un **riego** en la tabla `riegos`. El nivel de cada componente lo calcula `ReglaDeCrecimiento` (dominio puro) a partir de cuántos riegos tiene la persona. Cambiar el umbral o el orden de los turnos no exige migrar datos, y no hay un contador que se pueda desincronizar.
3. **Crecimiento por evento e idempotente.** `AlCrearseNota` (área EspacioVerde) escucha `NotaCreada` y registra el riego. La llave primaria del riego es el id de la nota, así que un evento repetido no hace crecer el lote dos veces. El riego guarda solo ids y la fecha: ni el texto ni la emoción.
4. **Nadie empieza de cero.** La migración `RiegosDelEspacioVerde` convierte en riegos los desahogos guardados antes de esta historia.
5. **Lectura.** `GET /api/espacio-verde` devuelve el lote de la persona con sesión. La regla expone además qué componente creció con un riego dado (`CrecioConElRiego`): es la señal de "hito del árbol" para HU-06a-2.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Guardar el nivel de cada componente y sumarlo en cada evento | El contador puede desincronizarse si un evento falla o se repite; cambiar el umbral exigiría recalcular a mano |
| Calcular el lote contando la tabla `desahogos` | El área EspacioVerde leería datos de otra área; además se pierde el evento como único disparador del crecimiento (TEC-03) |
| Que crezcan todos los componentes a la vez | Descartado por el PO: el lote debe crecer de a un componente |
| Que crezca algo con cada desahogo (escalonado) | Descartado por el PO: el crecimiento visible es cada 3 desahogos; los intermedios suman nutrición |

## Consecuencias

- **Positivas:** la regla es pura, se prueba sin base de datos y cambia sin migraciones. El crecimiento es idempotente por diseño. HU-06a-2 ya tiene su señal de hito.
- **Negativas:** consultar el lote cuenta los riegos de la persona en cada petición. Es barato (índice por persona y a lo sumo cientos de filas), pero si creciera mucho se podría guardar un total. Si el manejador del evento falla, ese desahogo no riega, porque el bus en memoria no reintenta (TEC-03). Se puede reparar convirtiendo de nuevo en riegos los desahogos que falten, con la misma consulta de la migración.

## Verificación

- **Pruebas de dominio:** el ritmo exacto (3, 6, 9, 12, 21 y 27), que nunca crecen dos componentes a la vez, la nutrición, el umbral configurable y el hito por riego.
- **Pruebas de aplicación:** cada desahogo riega el lote de su dueña, un evento repetido cuenta una sola vez, y cada persona ve solo su lote.
- **Prueba de punta a punta en una base PostgreSQL local** (2026-10-29): la migración convierte en riegos los desahogos existentes, y 27 desahogos por la API recorren todas las etapas hasta el lote completo.
