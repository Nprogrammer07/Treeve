# ADR-001 · Mensajes de apoyo con grafo de composición

- **Estado:** Aceptado · pendiente de implementación
- **Decisores:** Nicolás (arquitecto), equipo Treeve
- **Historias relacionadas:** HU-06, HU-06a-1 a HU-06a-4

## Contexto

HU-06 exige un mensaje de apoyo personalizado según la emoción, en ≤ 2 s en el 95 % de los casos, sin repetir fragmentos recientes. Los desahogos son datos emocionales sensibles (HU-05): nadie distinto del propietario puede leerlos.

## Decisión

El mensaje se arma con un **motor de reglas sin IA**. Cada mensaje combina 5 ranuras; cada ranura se llena con un fragmento elegido según señales calculadas en memoria a partir del desahogo.

### Ranuras

| Ranura | Función | Ejemplo (tristeza) |
|---|---|---|
| 1. Saludo | Nombrar al usuario por su apodo | "Nico," |
| 2. Validación | Reconocer la emoción sin juzgar | "lo que estás sintiendo tiene todo el sentido." |
| 3. Reflejo | Mostrar que se entendió el tema | "Cuando algo en casa pesa, pesa en todo lo demás." |
| 4. Contraste o complemento | Contrarrestar lo negativo o potenciar lo positivo | "No tienes que resolverlo hoy; basta con haberlo soltado aquí." |
| 5. Puente al árbol | Conectar con el juego | "Tu árbol recibió estas palabras como lluvia suave." |

### Señales

| Señal | Cálculo | Afecta |
|---|---|---|
| Emoción | Elegida por el usuario | Todas; define la metáfora |
| Tema | Palabras clave: trabajo, estudio, familia, pareja, amistad, salud, dinero | Reflejo |
| Intensidad | Longitud, mayúsculas, signos repetidos, palabras absolutas | Validación y contraste |
| Momento del día | Hora local del usuario | Saludo |
| Tendencia | Últimas 3–5 emociones | Contraste |
| Racha | Días seguidos con desahogo | Puente |
| Primer desahogo | Conteo = 1 | Saludo y puente |
| Hito del árbol | Umbral alcanzado (HU-07a) | Puente |
| Crisis | Lista de señales de riesgo | Corta el flujo |

Metáforas: tristeza = lluvia; rabia = tormenta que pasa; duda = niebla que se levanta; miedo = raíces que sostienen; felicidad = sol.

### Flujo del grafo

1. ¿Señales de crisis? → sí: mensaje fijo con líneas de ayuda y fin (nunca se compone).
2. Extraer señales.
3. Detectar casos especiales (primer desahogo, hito, racha, tendencia).
4. Rama por emoción: contrarrestar o complementar.
5. Filtrar fragmentos compatibles por ranura; si ninguno coincide, usar uno genérico (nunca queda sin respuesta).
6. Elegir por peso, excluyendo los IDs usados en las últimas 5 respuestas del usuario.
7. Ensamblar las 5 ranuras y guardar los IDs usados.

### Formato de fragmento (datos, no código)

```json
{"id": "TRI-REF-07", "ranura": "reflejo", "emocion": "tristeza", "temas": ["familia"], "intensidad": ["media", "alta"], "momento": ["noche"], "peso": 2, "texto": "Cuando algo en casa pesa, pesa en todo lo demás."}
```

### Ubicación en la Onion Architecture (área `MensajesApoyo`, ver ADR-004)

| Anillo | Pieza |
|---|---|
| Modelo de dominio (`Treeve.Domain/MensajesApoyo`) | `Senales`, `Fragmento`, `ReglaCrisis`, `EstrategiaPorEmocion` |
| Servicios de dominio (`Treeve.Domain.Services/MensajesApoyo`) | `IGeneradorMensajeApoyo`; `MotorDeRespuesta` (puro, implementa `IGeneradorMensajeApoyo` y recibe la semilla aleatoria como parámetro); interfaces `IRepositorioFragmentos` e `IHistorialRespuestas` |
| Servicios de aplicación (`Treeve.Application/MensajesApoyo`) | Caso de uso `GenerarMensajeApoyo` |
| Infraestructura (`Treeve.Infrastructure`) | Fragmentos en JSON versionado o tabla; historial en la base de datos |

Una IA futura entraría como otra implementación de `IGeneradorMensajeApoyo` en `Infrastructure`, sin tocar el dominio.

### Reglas de contenido

- Validar antes de animar (evitar positividad tóxica).
- Reflejar el tema; nunca citar el texto del usuario.
- Sin consejos médicos ni diagnósticos; no fingir que escribe una persona.
- Fragmentos compatibles con cualquier vecino de ranura.
- Revisión por alguien con formación en psicología de tristeza, miedo y crisis.
- Líneas de ayuda: `TODO: verificar líneas de ayuda de Colombia` hasta que el equipo las confirme.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| IA local en las 3 laptops del equipo con balanceador | Viola la privacidad de HU-05, no cumple 2 s, depende de laptops encendidas y exige túneles |
| API comercial de IA | Costo y envío de datos sensibles a terceros |
| Servidor de inferencia propio | Costo |
| 10 plantillas fijas | Repetitivo |

## Consecuencias y verificación

- Motor con pruebas de semilla fija y sin imports de infraestructura (verificado por `Treeve.ArchitectureTests`).
- Ninguna respuesta repite un fragmento de las 5 anteriores del usuario.
- Texto con señales de crisis → siempre mensaje fijo.
- ≤ 2 s en p95 entre guardar y ver el mensaje; se genera de forma síncrona al guardar el desahogo, no por evento.
- Ningún log, evento ni tabla guarda el texto ni el tema detectado.
- Revisión humana de 200 combinaciones al azar sin incoherencias.
