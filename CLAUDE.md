# Treeve — Contexto del proyecto para Claude Code

> Documento de contexto para el agente de código. Resume el producto, los requisitos, las decisiones de arquitectura, el plan de trabajo y el estado actual del desarrollo.
> Última actualización: 13 de octubre de 2026.
> Idioma del proyecto: español (código en inglés o español según se acuerde; documentación y mensajes al usuario en español).

---

## 0. Cómo debe trabajar Claude Code en este proyecto

1. **Antes de escribir código, confirma las decisiones abiertas** de la sección 11. La arquitectura es **Onion** ([ADR-004](docs/adr/ADR-004-onion-architecture.md)). El stack ya está decidido en [ADR-003](docs/adr/ADR-003-stack-tecnologico.md): C# / .NET 10 en el backend; React + TypeScript + PixiJS (renderizado 2.5D) en el frontend. **No agregues tecnologías al stack.** Las herramientas de compilación, pruebas y calidad (Vite, Vitest, Oxlint, dependency-cruiser, xUnit, ArchUnitNET) no forman parte del stack; están en ADR-003, sección "Herramientas". Dominio en español y términos técnicos en inglés.
2. **Trabaja por historia de usuario.** Cada cambio debe estar ligado a un ID del backlog (HU-xx o TEC-xx). Usa sus criterios de aceptación como especificación (enfoque *spec-driven*): primero lee el criterio, luego planea, luego implementa y prueba.
3. **Respeta la Onion Architecture** (sección 5, ADR-004). El núcleo (dominio, servicios de dominio y casos de uso) nunca importa frameworks, ORM, SDK de Supabase, HTTP ni nada de infraestructura. El frontend es presentación: no decide reglas de negocio.
4. **Privacidad de los desahogos es innegociable.** Nunca escribas el texto de un desahogo en logs, eventos, mensajes de error, respuestas de staff ni fixtures con datos reales. Nunca persistas el "tema" detectado por el motor de respuestas.
5. **No uses IA para generar mensajes de apoyo en tiempo de ejecución.** La decisión vigente (ADR-001) es un grafo de composición basado en reglas.
6. **Cambios de base de datos solo mediante migraciones versionadas.**
7. **No inventes líneas de ayuda ni teléfonos de crisis.** Deja un marcador `TODO: verificar líneas de ayuda de Colombia` hasta que el equipo las confirme.
8. **Cumple la Definition of Done** (sección 9) antes de dar una historia por terminada.
9. Si una tarea exige una decisión de arquitectura nueva o cambia una existente, **propón un ADR** antes de implementarla.

---

## 1. El producto

**Treeve** es una aplicación web de bienestar emocional con estética de videojuego relajante.

- El usuario elige la emoción que siente, escribe un **desahogo** en una hoja con apariencia de papel y recibe un **mensaje de apoyo personalizado**.
- Cada desahogo "riega" un **árbol** en su **espacio verde** personal (lote), que crece por etapas: brote → tallo → flor → árbol adulto. Se muestra en una escena **2.5D**.
- Hay sonidos ambientales (lluvia, pájaros, olas, bosque, río).
- Los usuarios pueden sugerir funcionalidades; el staff las gestiona desde un panel separado.
- Público: jóvenes y adultos en momentos de carga emocional, con uso frecuente de noche. La experiencia debe sentirse calmada, privada y acogedora; nunca clínica ni infantil.

**Contexto académico:** proyecto de la materia Arquitectura de Software. Se busca una arquitectura exigente y cercana a la práctica laboral, con decisiones justificadas (drivers, ADRs, trade-offs).

**Módulos futuros (fuera del alcance de la versión 1):** retroalimentación de pareja, resumen mensual, mensajes de apoyo generados por IA.

---

## 2. Equipo y roles

| Persona | Roles |
|---|---|
| **Nicolás** | Product Owner, Scrum Master, arquitecto de software y desarrollador de apoyo (≈50% de capacidad como desarrollador) |
| **Luis** | Desarrollador frontend, con conocimientos de UX/UI |
| **Juan José** | Desarrollador backend, incluida la base de datos |

- Metodología: **Scrum**, 4 sprints de **1 semana** para la versión 1.
- Gestión: **ClickUp** (ver sección 10).
- Se usa IA como asistente de código; las estimaciones se ajustan con la velocidad real medida al cerrar el Sprint 1.

---

## 3. Requisitos (historias de usuario)

Fuente: Excel "Historias de Usuario Treeve". Los RNF siguen ISO 25010.

### HU-01 · Pantalla inicial (visitante)
Como visitante, quiero ver una interfaz inicial con un espacio verde ya crecido, pájaros volando y el sonido del río, para conocer el ambiente relajante de Treeve antes de registrarme.
- RF: escena 2.5D automática al ingresar sin sesión; sonido de río automático con opción visible de silenciar; accesos visibles a "Iniciar sesión" y "Registrarse".
- RNF (Usabilidad): carga completa < 3 s en 10 Mbps; Lighthouse ≤ 3 s en p90; audio asíncrono que no bloquea el renderizado.

### HU-02 · Registro
Como visitante, quiero registrarme con la menor cantidad de datos posible.
- RF: obligatorios nombre completo, apodo, usuario y contraseña; correo opcional (para recuperación); campo opcional "¿Por qué decidiste instalarte Treeve?"; política mínima de contraseña; acceso automático tras registrarse.
- RNF (Seguridad): contraseñas con hash y salt; todo por HTTPS/TLS; se rechazan contraseñas que no cumplan la política.

### HU-03 · Inicio de sesión (dividida en HU-03a y HU-03b)
- **HU-03a:** login con usuario o correo + contraseña; error claro sin indicar qué dato falló. RNF (Confiabilidad): bloqueo temporal tras 5 intentos fallidos (p. ej. 15 min); disponibilidad del login ≥ 99.5% mensual.
- **HU-03b:** recuperación de contraseña por correo si el usuario lo registró; enlace de un solo uso que expira; no revelar si un correo existe.

### HU-04 · Selección de emoción
- RF: panel con al menos 5 emociones con iconografía (símbolos y colores); una sola emoción por sesión de desahogo; tras elegir se habilita la escritura.
- RNF (Usabilidad): navegable por teclado y lector de pantalla; etiqueta ARIA o texto alternativo por ícono; no depender solo del color; ≥ 90% de acierto al identificar los íconos en prueba de usabilidad.
- Emociones mínimas: tristeza, rabia, miedo, duda, felicidad.

### HU-05 · Escritura del desahogo
- RF: área de texto estilizada como hoja de papel, asociada a la emoción; editable antes de guardar; al guardar se asocia fecha/hora y emoción; límite de caracteres visible.
- RNF (Seguridad): **cifrado en reposo**; solo el propietario accede; ningún otro usuario, staff ni administrador puede leer el contenido desde la interfaz ni desde la API.

### HU-06 · Mensaje de apoyo personalizado
- RF: al guardar se muestra un mensaje relacionado con la emoción; difiere según la emoción (contrarresta una negativa o complementa una positiva); el usuario puede cerrarlo y seguir navegando.
- RNF (ajustado por ADR-001): mensaje en ≤ 2 s en el 95% de los casos; 5 ranuras con al menos 8 variantes por ranura y emoción; un usuario no recibe un fragmento usado en sus últimas 5 respuestas.
- Dividida en HU-06a-1 a HU-06a-4 (ver backlog).

### HU-07 · Crecimiento del árbol (dividida en HU-07a y HU-07b)
- RF: cada desahogo incrementa la nutrición/crecimiento; animación de "riego"; umbral configurable (cada X desahogos) que desbloquea nueva etapa; espacio verde accesible en cualquier momento.
- RNF (Eficiencia de desempeño): ≥ 30 FPS en dispositivos de gama media; carga de la escena < 4 s en 10 Mbps.
- **HU-07a:** lógica de dominio (nutrición, umbrales, etapas). **HU-07b:** escena 2.5D y animación.

### HU-08 · Sonidos ambientales
- RF: al menos 5 sonidos (lluvia, pájaros, olas, bosque, río) o silencio; persiste al navegar; control de volumen y silencio.
- RNF: sin caídas de FPS > 10% con audio y escena 2.5D activos; cambio de pista sin cortes > 200 ms; < 5% de CPU/batería adicional en móviles.

### HU-09 · Sugerir funcionalidad
- RF: botón "Sugerir funcionalidad" en el menú principal; texto libre; confirmación de envío; historial propio de sugerencias.
- RNF (Mantenibilidad): cada sugerencia con ID único, fecha, texto, usuario y estado (pendiente / en revisión / implementada / rechazada); el staff filtra por estado, fecha o usuario.

### HU-10 · Acceso diferenciado de staff
- RF: punto de acceso exclusivo al panel staff/admin; solo roles staff o admin tras autenticarse; usuario regular redirigido o con acceso denegado.
- RNF (Seguridad): RBAC validado **en el backend en cada petición**; intentos no autorizados registrados con usuario, fecha/hora e IP.

### HU-11 · Gestión de sugerencias (staff)
- RF: listado con usuario, fecha y texto; cambio de estado; comentario visible para el usuario que sugirió.
- RNF (Usabilidad): filtrar/ordenar 1000+ registros en < 2 s; paginación o scroll virtual.

### HU-12 · Gestión de staff (administrador)
- RF: listar staff; ascender un usuario registrado a staff; revocar el rol; notificar al usuario el cambio.
- RNF (Seguridad): solo administradores cambian roles, validado en backend; log de auditoría inmutable con administrador, usuario afectado, rol anterior, rol nuevo y marca de tiempo.

---

## 4. Drivers arquitectónicos

### Atributos de calidad priorizados
- **Dominante: modificabilidad.** El producto debe crecer con módulos nuevos (pareja, resumen mensual) sin reescribir el núcleo.
- **Crítico: privacidad y seguridad** de los desahogos (datos emocionales sensibles).
- **Importante: rendimiento** (0.5 s promedio por petición como meta general; 2 s para el mensaje de apoyo; 30 FPS en la escena).
- **Importante: usabilidad y accesibilidad.**
- Escalabilidad e interoperabilidad: prioridad baja por ahora.

### Restricciones
- 4 semanas, 3 personas, presupuesto mínimo, proyecto académico.
- Carga estimada para dimensionar: ~1500–2000 usuarios.

### Objetivos de negocio
- Extensibilidad futura con módulos de bienestar.
- MVP funcional en 4 semanas.
- Demostrar dominio de arquitectura justificada (objetivo académico).

---

## 5. Arquitectura decidida: Onion Architecture ([ADR-004](docs/adr/ADR-004-onion-architecture.md))

| Nivel (C4) | Decisión |
|---|---|
| Contenedores | SPA `Treeve.Web` → API `Treeve.Api` (un solo backend desplegable) → PostgreSQL. |
| Componentes | **Onion Architecture** (familia Clean): el modelo de dominio en el centro y todas las dependencias hacia adentro. El frontend es presentación, en el anillo externo. |
| Comunicación entre áreas | **Eventos de dominio con bus en memoria** detrás de un puerto. Broker real (RabbitMQ, SQS/SNS) diferido. |

> Nota: versiones anteriores de este documento decían "monolito modular con Clean por módulo". Eso no fue lo decidido; la decisión es Onion.

### Anillos
| Anillo | Proyecto (carpeta) | Contiene | Reglas |
|---|---|---|---|
| 1 · Modelo de dominio | `Treeve.Domain` (`src/Core`) | Entidades, objetos de valor, eventos de dominio (`Nota`, `Arbol`, `Fragmento`, `Senales`, reglas de crisis) | No depende de nada |
| 2 · Servicios de dominio | `Treeve.Domain.Services` (`src/Core`) | Reglas que cruzan entidades (`MotorDeRespuesta`) e interfaces de repositorio (`IRepositorioNotas`) | Solo depende del anillo 1 |
| 3 · Servicios de aplicación | `Treeve.Application` (`src/Core`) | Casos de uso (`CrearNota`, `GenerarMensajeApoyo`), autorización, manejadores de eventos, puertos (cifrado, reloj, bus) | Solo depende de los anillos 1 y 2 |
| Externo · Infraestructura | `Treeve.Infrastructure` (`src/Infrastructure`) | Repositorios con la base de datos, cifrado, bus en memoria | Implementa las interfaces del núcleo; no conoce la presentación |
| Externo · Presentación | `Treeve.Api` y `Treeve.Web` (`src/Presentation`) | Endpoints y DTOs (`Endpoints/`), composición (`Composition/`); frontend React | Los endpoints solo llaman casos de uso; el frontend solo habla con la API |
| Externo · Pruebas | `tests/` | `Treeve.Domain.Tests`, `Treeve.Application.Tests`, `Treeve.ArchitectureTests` | — |

### Áreas funcionales (carpetas dentro de cada anillo, no proyectos)
- **Identidad:** registro, login, roles, auditoría de accesos.
- **Desahogos (notas):** emoción, escritura, cifrado.
- **EspacioVerde (lote):** riegos, nutrición y crecimiento de árbol, flores y bosque (HU-07a, ADR-007).
- **MensajesApoyo:** motor del grafo de composición.
- **Sugerencias:** envío, historial, gestión por staff.
- **Administracion:** gestión de staff y sus logs (HU-12).
- **Notificaciones:** avisos dentro de la aplicación, que nacen de eventos de dominio (HU-12, ADR-006).

Ejemplo: `src/Core/Treeve.Domain/Desahogos/Nota.cs` → namespace `Treeve.Domain.Desahogos`.

- **Regla de dependencias verificada en CI:** referencias entre proyectos hacia el centro + `tests/Treeve.ArchitectureTests` (ArchUnitNET). Frontend: `src/Presentation/Treeve.Web/.dependency-cruiser.cjs`. Si algo apunta hacia afuera, el build falla. `EstructuraDelRepositorioTests` además falla si hay código fuera de los anillos o en un lenguaje distinto del stack (todo el backend en C#, todo el frontend en TypeScript), y si `.github/`, `deploy/` o `docs/` contienen algo distinto de lo suyo. `.github/CODEOWNERS` exige la aprobación del arquitecto para cambiar estas reglas.
- **Interfaces adentro, implementaciones afuera.** El núcleo no conoce el contenedor de dependencias: los casos de uso se registran en `Treeve.Api/Composition` y la infraestructura en `Treeve.Infrastructure/DependencyInjection.cs`.
- **Ceremonia proporcional:** todos los anillos para lógica de negocio no trivial (crecimiento del árbol, motor de respuestas, autorización); un CRUD trivial puede saltarse el servicio de dominio, pero siempre pasa por un caso de uso.
- **Autorización siempre en el caso de uso**, nunca solo en el frontend.
- Guías para el equipo: [backend](docs/guias/backend.md) y [frontend](docs/guias/frontend.md).

### Eventos de dominio
- `NotaCreada` (definido en `Treeve.Domain`) → manejado en `Treeve.Application` por el área EspacioVerde (crecimiento).
- Los eventos llevan **solo IDs y metadatos** (notaId, usuarioId, emoción, fecha), **nunca el texto**.
- Consumidores **idempotentes** (un evento repetido no hace crecer el árbol dos veces).
- ID de correlación en logs.
- El mensaje de apoyo **no** se genera por evento: se genera de forma síncrona al guardar el desahogo y se devuelve en la misma respuesta (para cumplir los 2 s).

### Arquitecturas evaluadas y descartadas
- **Microservicios con broker desde el inicio:** complejidad operativa no justificada por equipo, tiempo ni carga.
- **SOA / ESB:** acoplamiento síncrono por contratos de API y punto único de falla.
- **Arquitectura orientada a eventos completa:** el acoplamiento se traslada a los contratos de eventos; validación de seguridad descentralizada.
- **Hexagonal:** válida, pero se eligió Onion (familia Clean) por su separación explícita entre dominio, servicios de dominio y casos de uso, regla de dependencia verificable, trazabilidad con los casos de uso UML y mayor estandarización.
- **Clean por módulos** (primera estructura de TEC-01): partía de un "monolito modular" que no se decidió. Reemplazada por ADR-004.

---

## 6. ADR-001 · Mensajes de apoyo con grafo de composición (Aceptado; motor implementado en HU-06a-1, ver precisiones en el ADR)

**Decisión:** el mensaje de apoyo se arma con un motor de reglas sin IA. Cada mensaje combina 5 ranuras; cada ranura se llena con un fragmento elegido según señales del desahogo.

**Descartado:** IA local en las 3 laptops del equipo con balanceador (viola privacidad de HU-05, no cumple 2 s, depende de laptops encendidas, exige túneles); API comercial (costo y envío de datos a terceros); servidor de inferencia (costo); 10 plantillas fijas (repetitivo).

### Ranuras
| Ranura | Función | Ejemplo (tristeza) |
|---|---|---|
| 1. Saludo | Nombrar al usuario por su apodo | "Nico," |
| 2. Validación | Reconocer la emoción sin juzgar | "lo que estás sintiendo tiene todo el sentido." |
| 3. Reflejo | Mostrar que se entendió el tema | "Cuando algo en casa pesa, pesa en todo lo demás." |
| 4. Contraste o complemento | Contrarrestar lo negativo o potenciar lo positivo | "No tienes que resolverlo hoy; basta con haberlo soltado aquí." |
| 5. Puente al árbol | Conectar con el juego | "Tu árbol recibió estas palabras como lluvia suave." |

### Señales (calculadas en memoria)
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

### Ubicación en la Onion
| Anillo | Pieza |
|---|---|
| Modelo de dominio | `Senales`, `Fragmento`, `ReglaCrisis`, `EstrategiaPorEmocion` |
| Servicios de dominio | `IGeneradorMensajeApoyo`; `MotorDeRespuesta` (puro, lo implementa y recibe la semilla aleatoria como parámetro); `IRepositorioFragmentos`, `IHistorialRespuestas` |
| Servicios de aplicación | `GenerarMensajeApoyo` |
| Infraestructura | Fragmentos en JSON versionado o tabla; historial en la base de datos |

Una IA futura entraría como otra implementación de `IGeneradorMensajeApoyo` en `Infrastructure`, sin tocar el dominio.

### Reglas de contenido
- Validar antes de animar (evitar positividad tóxica).
- Reflejar el tema; nunca citar el texto del usuario.
- Sin consejos médicos ni diagnósticos; no fingir que escribe una persona.
- Fragmentos compatibles con cualquier vecino de ranura.
- Revisión por alguien con formación en psicología de tristeza, miedo y crisis.

### Criterios de verificación
- Motor con pruebas de semilla fija y sin imports de infraestructura (CI).
- Ninguna respuesta repite un fragmento de las 5 anteriores del usuario.
- Texto con señales de crisis → siempre mensaje fijo.
- ≤ 2 s en p95 entre guardar y ver el mensaje.
- Ningún log, evento ni tabla guarda el texto ni el tema detectado.
- Revisión humana de 200 combinaciones al azar sin incoherencias.

---

## 7. ADR-002 · Persistencia (Aceptado el 16-oct-2026, ver [ADR-002](docs/adr/ADR-002-persistencia.md))

Puntos que el ADR resolvió:
1. **Solo el backend accede a la base de datos**, a través de adaptadores de persistencia. El frontend no consulta la base de datos directamente (aunque Supabase lo permita), para no saltarse los casos de uso.
2. **Cifrado de los desahogos:** en la aplicación o con funciones de la base de datos; **la llave no puede vivir en la misma base de datos**.
3. **Organización de tablas:** por revisar tras ADR-004 (ya no hay módulos; p. ej. un esquema por área funcional). Solo `Treeve.Infrastructure` toca la base de datos.
4. **Migraciones versionadas como única vía de cambio**; nada manual en producción.
5. **Datos que nunca se guardan:** tema detectado por el grafo; texto en logs.

### Crecimiento incremental del esquema
| Sprint | Historia | Tablas o cambios |
|---|---|---|
| 1 | TEC-02 | Base de datos y sistema de migraciones |
| 1 | HU-02 | `usuarios` |
| 1 | HU-03a | Intentos fallidos y bloqueo |
| 1 | HU-05 | `desahogos` (texto cifrado) |
| 2 | HU-07a | `riegos` (un riego por desahogo; el nivel de árbol, flores y bosque se calcula, ADR-007) |
| 2 | HU-06a-1 | `historial_respuestas` (IDs de fragmentos); fragmentos si van en tabla |
| 4 | HU-09 / HU-11 | `sugerencias` y respuestas del staff |
| 4 | HU-10 / HU-12 | Roles y `auditoria` |

---

## 8. Product Backlog y plan de sprints

Estimación en puntos de historia (1, 2, 3, 5, 8). Las cifras son una propuesta inicial; el equipo debe ajustarlas con Planning Poker. Prioridad MoSCoW.

### Sprint 1 · Fundaciones
**Sprint Goal:** Un usuario nuevo puede registrarse y guardar su primer desahogo de forma privada.
**Demostración:** registro en el entorno desplegado, selección de emoción, desahogo guardado y consulta a la base que muestra el texto cifrado.

| ID | Elemento | Pts | Tipo | Responsable |
|---|---|---|---|---|
| TEC-01 | Estructura Clean, repositorio y CI con regla de dependencias | 3 | Habilitadora | Nicolás |
| TEC-02 | Despliegue inicial de frontend, backend y base de datos | 2 | Habilitadora | Juan José + Nicolás |
| HU-02 | Registro con datos mínimos | 3 | Núcleo | Juan José + Luis |
| HU-04 | Selección de emoción con íconos accesibles | 2 | Núcleo | Luis |
| HU-05 | Escritura en papel con cifrado en reposo | 5 | Núcleo | Juan José + Luis |
| HU-03a | Login y bloqueo tras 5 intentos | 3 | Opcional (línea de corte) | Juan José + Luis |

Propuestos y **aún no creados en ClickUp**: TEC-06 (ADR-002 y modelo conceptual de datos, 2 pts, Nicolás + Juan José) y TEC-07 (dirección visual y sistema de diseño mínimo, 3 pts, Luis). Si entran, HU-03a pasa al Sprint 2.

### Sprint 2 · El corazón del juego
**Sprint Goal:** Al desahogarse, el usuario ve crecer su árbol y recibe un mensaje de apoyo.

| ID | Elemento | Pts | Tipo | Responsable |
|---|---|---|---|---|
| TEC-03 | Evento `NotaCreada` con bus en memoria | 2 | Habilitadora | Nicolás |
| HU-07a | Lógica de nutrición y umbrales | 3 | Núcleo | Juan José |
| HU-07b | Escena 2.5D y animación de riego | 8 | Núcleo | Luis + Nicolás |
| HU-06a-1 | Motor del grafo: ranuras, anti-repetición y crisis (5 emociones, decidido el 22-oct-2026) | 5 | Núcleo | Nicolás + Juan José |

Riesgo principal: HU-07b. Hacer un *spike* técnico de 1–2 días midiendo FPS en gama media. Plan B: animación simple y 2.5D completo en el Sprint 3.

### Sprint 3 · La experiencia
**Sprint Goal:** Desahogarse en Treeve se siente personal y relajante, desde la primera pantalla hasta la respuesta.

| ID | Elemento | Pts | Tipo | Responsable |
|---|---|---|---|---|
| HU-06a-2 | Señales de tendencia, racha, hito y momento del día | 3 | Núcleo | Juan José |
| HU-06a-3 | Contenido completo de fragmentos | 3 | Núcleo | Nicolás |
| HU-01 | Pantalla inicial 2.5D con sonido (reutiliza la escena de HU-07b) | 5 | Núcleo | Luis |
| HU-08 | Sonidos ambientales | 3 | Núcleo | Luis |
| HU-06a-4 | Animación de escritura del mensaje | 2 | Opcional | Luis |

### Sprint 4 · Gestión y cierre
**Sprint Goal:** El staff puede administrar la plataforma de forma segura, sin acceder a los desahogos.

| ID | Elemento | Pts | Tipo | Responsable |
|---|---|---|---|---|
| HU-10 | Acceso staff con RBAC y auditoría | 3 | Núcleo | Juan José |
| HU-09 | Sugerir funcionalidad | 3 | Núcleo | Juan José + Luis |
| HU-11 | Gestión de sugerencias | 5 | Núcleo | Juan José + Luis |
| TEC-05 | Pruebas de carga y seguridad, C4 y ADRs | 3 | Habilitadora | Nicolás |
| HU-12 | Gestión de staff | 5 | Opcional | Juan José + Luis |
| HU-03b | Recuperación de contraseña | 3 | Opcional | Juan José |

Línea de corte del Sprint 4: primero HU-03b, después HU-12.

### Dependencias clave
- HU-04 → HU-05 → (TEC-03 → HU-07a → HU-07b → HU-01) y (HU-06a-1 → HU-06a-2, HU-06a-3).
- HU-07a → HU-06a-2 (señal de hito).
- HU-02 → HU-10 → HU-11 ← HU-09.
- TEC-01 y TEC-02 habilitan todo.

### Futuro (fuera de alcance)
- Mensajes de apoyo con IA (nuevo adaptador detrás de `GeneradorMensajeApoyo`).
- Módulo de retroalimentación de pareja (suscriptor de `NotaCreada`).
- Módulo de resumen mensual (tarea programada; resume emociones y crecimiento, no textos).

---

## 9. Definition of Done

Versión propuesta (pendiente de aprobación del equipo; en ClickUp está una versión anterior más corta).

### Nivel 1 · Cada historia
| Condición | Verificación |
|---|---|
| Cumple sus criterios de aceptación RF y RNF | Casillas en ClickUp, probado por otra persona |
| Respeta la regla de dependencias del Onion | CI |
| Si cambia una decisión de arquitectura, hay ADR nuevo o actualizado | Revisión del arquitecto |
| Tiene pruebas de las reglas de negocio y pasan | CI |
| Otra persona revisó el PR con el checklist de arquitectura | Aprobación en el repositorio |
| El texto de los desahogos no aparece en logs, eventos ni respuestas de staff | Checklist del PR |
| Autorización validada en el backend; sin secretos en el código | Checklist del PR |
| Si tiene interfaz: usable con teclado y con etiquetas ARIA | Prueba manual |
| Si cambia la base de datos: migración versionada y revisada | Revisión del PR |
| Desplegada y funcionando en el entorno compartido | Prueba en entorno |
| Tarea en ClickUp en "completadas" con casillas marcadas | Scrum Master |

### Nivel 2 · Incremento al final del sprint
- El Sprint Goal se demuestra de punta a punta en el entorno desplegado.
- Ninguna historia anterior se rompió (pruebas completas en verde).
- Los RNF de rendimiento del sprint se midieron y registraron.
- Diagramas C4 y ADRs reflejan lo construido.

### Checklist de PR (arquitectura)
1. ¿Respeta la regla de dependencias?
2. ¿La autorización está en el caso de uso?
3. ¿Los eventos llevan solo IDs y metadatos?
4. ¿Hay pruebas?
5. ¿Algún cambio merece un ADR?

---

## 10. Gestión en ClickUp

Espacio "Espacio del equipo [ES-LA]" → carpeta **Treeve · Desarrollo v1** (ID 901711889307).

| Lista | ID |
|---|---|
| Product Backlog | 901717767152 |
| Futuro (fuera de alcance) | 901717767153 |
| Sprint 1 | 901717767154 |
| Sprint 2 | 901717767155 |
| Sprint 3 | 901717767156 |
| Sprint 4 | 901717767157 |

- Formato de nombre de tarea: `[Sprint planeado] ID · Elemento (puntos)`.
- Prioridad: Alta = Must, Normal = Should, Baja = Could.
- Estados actuales: pendiente → en curso → completadas. **Falta agregar "en revisión"** (manual).
- Las listas de sprint están vacías; las tareas se mueven desde el Product Backlog en cada Sprint Planning.
- Lo no terminado vuelve al Product Backlog al cerrar el sprint.

IDs de tareas en ClickUp:
| ID backlog | Tarea ClickUp |
|---|---|
| TEC-01 | 86e3pfeqj |
| TEC-02 | 86e3pfer1 |
| HU-02 | 86e3pferq |
| HU-03a | 86e3pfetf |
| HU-04 | 86e3pfeu7 |
| HU-05 | 86e3pfevb |
| TEC-03 | 86e3pfewx |
| HU-07a | 86e3pfexq |
| HU-07b | 86e3pfeyf |
| HU-06a-1 | 86e3pfezq |
| HU-06a-2 | 86e3pff18 |
| HU-06a-3 | 86e3pff1t |
| HU-06a-4 | 86e3pff2n |
| HU-01 | 86e3pff3b |
| HU-08 | 86e3pff43 |
| HU-09 | 86e3pff5m |
| HU-10 | 86e3pff7f |
| HU-11 | 86e3pff84 |
| HU-12 | 86e3pff90 |
| HU-03b | 86e3pff9y |
| TEC-05 | 86e3pffau |

---

## 11. Decisiones abiertas (resolver antes o durante el Sprint 1)

1. ~~Stack tecnológico.~~ **Resuelto (13-oct-2026) en ADR-003.** Stack: C# / .NET 10 (con ASP.NET Core) y React + TypeScript + PixiJS. Herramientas, que no son parte del stack: Vite (compila el frontend), xUnit + ArchUnitNET, Vitest + Testing Library, Oxlint y dependency-cruiser. Falta la herramienta de migraciones, que se define en ADR-002 (candidata: EF Core + Npgsql).
2. **Infraestructura:** el backend es **propio** (se deduce de la Onion Architecture: el núcleo concentra los casos de uso; descartadas las funciones de Supabase como backend). Proveedores: Supabase (solo PostgreSQL) y Railway (backend) confirmados en ADR-002; Vercel (frontend) por confirmar en TEC-02.
3. ~~ADR-002 de persistencia.~~ **Aceptado (16-oct-2026):** solo el backend accede a PostgreSQL (Supabase solo como base de datos, esquema `treeve`), cifrado AES-256-GCM en la aplicación, migraciones con EF Core + Npgsql en `Treeve.Infrastructure`, backend en Railway con `deploy/Dockerfile`.
   - **Autenticación (ADR-005, aceptado el 20-oct-2026):** PBKDF2-SHA256 (600 000 iteraciones), sesiones con token opaco de 7 días (solo se guarda su hash), bloqueo de 15 minutos tras 5 intentos en la tabla `credenciales`, motivo de registro cifrado. Riesgo aceptado: se puede averiguar si un correo está registrado.
   - **Gestión de staff (ADR-006, aceptado el 27-oct-2026):** desde la API solo se asciende a staff o se revoca el staff (los administradores se asignan con SQL), autorización en la ruta y en cada caso de uso, cambio de rol y su log en una sola transacción, logs `auditoria_roles` y `auditoria_accesos` inmutables por trigger, y notificación dentro de la app por el evento `RolCambiado`.
   - **Crecimiento del espacio verde (ADR-007, aceptado el 29-oct-2026):** el lote tiene árbol, flores y bosque (4 niveles cada uno); cada 3 desahogos crece uno solo, por turnos; el estado se calcula a partir de la tabla `riegos`, que llena de forma idempotente el manejador de `NotaCreada`.
4. **Definition of Done v2** por aprobar y copiar a ClickUp y a la plantilla de PR.
5. **Planning Poker** pendiente: estimaciones aún no validadas por Luis y Juan José.
6. **Fechas de los sprints** sin definir.
7. **Luis y Juan José aún no están invitados a ClickUp** (solo Nicolás es miembro).
8. **Líneas de ayuda de crisis de Colombia** por verificar.
9. **Revisión psicológica** de los fragmentos: falta definir quién y cuándo.

---

## 12. Guía visual (para el frontend)

- Diseño **un sprint por delante** del desarrollo. Sprint 1: primeros dos días para sistema de diseño mínimo y wireframes de registro, emoción y escritura.
- Capas: dirección visual (moodboard) → sistema de diseño mínimo (colores, tipografía, espaciado en múltiplos de 8, componentes base) → wireframes → prototipo de alta fidelidad de pantallas clave.
- Tono: colores suaves, transiciones lentas (300–500 ms), poca fricción. **Sin rojos de alerta**; errores en ámbar suave con texto amable.
- Fondo nunca blanco puro; paleta de verdes, cremas y azules tenues; modo noche opcional.
- Tipografía sans-serif redondeada para la interfaz; manuscrita solo para el mensaje de apoyo.
- Color propio por emoción, siempre acompañado de ícono y texto (RNF de HU-04).
- Accesibilidad: contraste ≥ 4.5:1, objetivos táctiles ≥ 44 px, foco visible.
- Mobile-first a 390 px; escritorio a 1440 px para pantalla inicial y espacio verde.
- Dirección de arte 2.5D: isométrica, suave, naturaleza. Presupuesto de peso de recursos acorde a 30 FPS y cargas de 3–4 s.
- Recursos de terceros (ilustraciones, íconos, sonidos, fuentes) solo con licencia de uso libre, registrada en el repositorio.
- El panel de staff se ve claramente separado de la experiencia del usuario y nunca muestra textos de desahogos.
- Nombrar pantallas del prototipo con el ID de la historia (HU-01, HU-02…).

---

## 13. Estado actual del desarrollo (13 de octubre de 2026)

**Hecho**
- Requisitos: 12 historias con RF, RNF y criterios de aceptación.
- Análisis de drivers y priorización de atributos de calidad.
- Arquitectura decidida: Onion Architecture + eventos de dominio internos (ADR-004, 14-oct-2026; corrige la mención anterior a "monolito modular").
- ADR-001 aceptado (grafo de composición).
- Product Backlog de 21 elementos (~74 pts) cargado en ClickUp, con Sprint Goals por sprint.
- Guía de Sprint Planning y Definition of Done propuesta.
- Prompt para el prototipo en Figma preparado.

- Stack decidido (ADR-003, 13-oct-2026).
- **TEC-01 implementado en local con Onion** (pendiente de commit, repositorio remoto, PR y revisión): `Treeve.slnx` con los 5 proyectos de los anillos; `Treeve.ArchitectureTests` (13 pruebas: regla de dependencias, convenciones, estructura y lenguajes) y proyectos vacíos `Treeve.Domain.Tests` y `Treeve.Application.Tests`; `Treeve.Web` (React + TypeScript, `shared/api/clienteApi.ts`; herramientas: Vite, Vitest, Oxlint `jsx-a11y`, dependency-cruiser) en `src/Presentation`; CI de GitHub Actions; plantilla de PR; README; ADR-001, ADR-003 y ADR-004; guías en `docs/guias`.

- **HU-06a-1 y HU-06a-3 fusionadas (PR #11, 22-oct-2026):** motor del grafo para las 5 emociones, crisis que sugiere una línea sin redirigir ni guardar nada, historial de fragmentos cifrado (solo las últimas 5 respuestas) y contenido en JSON con 8 variantes generales por ranura y emoción (pendiente de revisión psicológica y de la revisión humana de 200 combinaciones). Conectado al guardado del desahogo en HU-05 (PR #13).
- **HU-12 fusionada (backend, PR #19, 29-oct-2026):** listar staff, ascender y revocar, logs de roles y de accesos para el administrador, log inmutable por trigger y notificación dentro de la app (ADR-006). Contrato para el frontend en `docs/guias/api-administracion.md`; la pantalla es de Luis.

- **HU-07a en el PR #21 (backend, 29-oct-2026):** árbol, flores y bosque crecen por turnos cada 3 desahogos (ADR-007); `GET /api/espacio-verde`; los desahogos existentes cuentan como riegos. Contrato en `docs/guias/api-espacio-verde.md`; Luis reemplaza `ETAPA_TEMPORAL` y dibuja flores y bosque por nivel.

**No iniciado**
- Repositorio remoto (GitHub) y primer PR.
- ADR-002, prototipo visual, Planning Poker, Sprint 1.

**Siguiente paso recomendado para Claude Code**
1. Crear el repositorio remoto, hacer el primer commit de TEC-01 y abrir el PR para revisión.
2. TEC-06 / ADR-002 (persistencia, cifrado, migraciones) antes de crear tablas.
3. TEC-02 y las historias del Sprint 1 en el orden del mapa de dependencias.
