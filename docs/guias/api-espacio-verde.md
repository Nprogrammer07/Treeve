# API del espacio verde · contrato para el frontend (HU-07a)

Base: la URL del backend. Pide sesión (`Authorization: Bearer <token>`, ver [api-identidad.md](api-identidad.md)); sin ella responde 401 `NO_AUTENTICADO`. Decisiones de fondo: [ADR-007](../adr/ADR-007-crecimiento-del-espacio-verde.md).

## Cómo crece el lote

El lote tiene tres componentes: **árbol**, **flores** y **bosque**, cada uno con niveles del 1 al 4. Cada desahogo guardado es un riego. Cada **3 desahogos** crece **un solo** componente, por turnos:

| Desahogos | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 |
|---|---|---|---|---|---|---|---|---|---|
| Crece | Árbol (tallo) | Flores | Bosque | Árbol (flor) | Flores | Bosque | Árbol (adulto) | Flores | Bosque |

Con 27 desahogos el lote queda completo. Los desahogos intermedios suman **nutrición**: el progreso hacia el siguiente crecimiento.

## Consultar el lote

`GET /api/espacio-verde` → 200

```json
{
  "etapaDelArbol": "tallo",
  "componentes": [
    { "componente": "arbol", "nivel": 2 },
    { "componente": "flores", "nivel": 2 },
    { "componente": "bosque", "nivel": 1 }
  ],
  "nivelMaximo": 4,
  "riegos": 7,
  "nutricion": 1,
  "riegosParaElSiguiente": 2,
  "siguienteEnCrecer": "bosque",
  "completo": false
}
```

| Campo | Qué es |
|---|---|
| `etapaDelArbol` | `brote`, `tallo`, `flor` o `arbol-adulto`: los mismos nombres que `EtapaArbol` de la escena. Reemplaza a `ETAPA_TEMPORAL` |
| `componentes` | Nivel de cada componente, de 1 a `nivelMaximo` |
| `riegos` | Desahogos guardados en total |
| `nutricion` y `riegosParaElSiguiente` | El progreso, por ejemplo una barra de `nutricion / (nutricion + riegosParaElSiguiente)` |
| `siguienteEnCrecer` | `arbol`, `flores` o `bosque`; `null` si el lote está completo |
| `completo` | `true` cuando todo llegó a su nivel máximo |

## Cuándo pedirlo

- **Al entrar al espacio verde**, para dibujar el lote.
- **Después de guardar un desahogo:** la respuesta del `POST /api/desahogos` ya llega con el riego registrado, así que un `GET` justo después trae el lote actualizado. Si `riegosParaElSiguiente` volvió a 3 y algún nivel subió, hubo crecimiento: es el momento de una animación especial.
