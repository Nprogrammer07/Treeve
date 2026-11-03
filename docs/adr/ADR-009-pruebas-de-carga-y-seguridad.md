# ADR-009 · Pruebas de carga y de seguridad de la API

- **Estado:** Aceptado (2026-11-03) por Nicolás
- **Fecha:** 2026-11-03
- **Decisores:** Nicolás (arquitecto)
- **Historias relacionadas:** TEC-05; RNF de HU-02, HU-03a, HU-05, HU-06, HU-10 y HU-11

## Contexto

TEC-05 pide medir los RNF de rendimiento y verificar los de seguridad antes de cerrar la versión 1. Los drivers que se miden son:

- **Rendimiento:** 0,5 s de promedio por petición, ≤ 2 s en p95 entre guardar un desahogo y recibir el mensaje de apoyo (HU-06, ADR-001), con la carga de diseño de ~1500–2000 personas registradas (CLAUDE.md, sección 4).
- **Seguridad y privacidad:** toda ruta privada exige sesión; el RBAC se valida en el backend en cada petición y los intentos sin permiso quedan en el log (HU-10); nadie más que la persona dueña lee un desahogo, que se guarda cifrado (HU-05); el texto nunca aparece en logs ni en respuestas de error; bloqueo tras 5 intentos fallidos (HU-03a).

Hasta ahora las pruebas cubren el dominio, los casos de uso y los repositorios por separado, pero ninguna recorre la API completa: un endpoint nuevo sin `RequireAuthorization()` no rompería nada en la CI. Y ninguna herramienta del ADR-003 genera carga concurrente ni mide percentiles.

Treeve todavía no tiene personas usuarias reales: el entorno desplegado se usa para pulir el producto. Producción y desarrollo comparten la base de Supabase (ADR-002).

## Decisión

1. **k6 para las pruebas de carga.** Es una **herramienta de desarrollo**, como Vite o xUnit en el ADR-003: no se despliega, no entra al paquete de la API ni del frontend y no cambia el stack. Los scripts están en JavaScript (el lenguaje de k6) en `tests/carga/`, la única carpeta del backend que admite `.js`; `EstructuraDelRepositorioTests` lo verifica. Se ejecuta a mano, nunca en la CI. Las metas son *thresholds* del script: si una no se cumple, k6 termina con error.
2. **`Microsoft.AspNetCore.Mvc.Testing` para las pruebas de seguridad de la API.** Es el paquete de pruebas oficial de ASP.NET Core (que ya es parte del stack): levanta la API completa en memoria. Viven en el proyecto nuevo `tests/Treeve.Api.Tests`, corren en la CI contra el PostgreSQL de usar y tirar (igual que las de `Treeve.Infrastructure.Tests`) y nunca contra Supabase. Recorren **todas** las rutas registradas, así que una ruta nueva sin autorización hace fallar la CI.
3. **Metas de carga** (*thresholds*):

   | Medida | Meta | Origen |
   |---|---|---|
   | Guardar un desahogo con su mensaje de apoyo | p95 ≤ 2 s | HU-06, ADR-001 |
   | Resto de rutas de la persona usuaria | promedio ≤ 0,5 s | CLAUDE.md, sección 4 |
   | Peticiones fallidas | < 1 % | — |
   | Inicio de sesión | se mide y se informa, sin meta propia | ADR-005 (PBKDF2 de 600 000 iteraciones) |

4. **Carga de diseño:** de 2000 personas registradas se asume un pico de **100 activas a la vez** (5 %, uso nocturno), cada una con una sesión realista: ver su espacio verde, desahogarse con pausas para escribir, mirar avisos y su historial de sugerencias. Una etapa de estrés lleva la carga a 200 para encontrar el límite. Los números se pueden cambiar al ejecutar.
5. **Dónde se mide: el entorno desplegado de producción (Railway + Supabase).** Decisión de Nicolás, válida **mientras no haya personas usuarias reales**. Reglas para no ensuciar ni dañar los datos:
   - Todas las cuentas de la prueba se llaman `k6-<corrida>-<n>` y escriben textos inventados, sin datos reales ni frases de crisis.
   - La carga no usa `/api/staff` ni `/api/admin`: dejaría filas en los logs de auditoría, que son inmutables (ADR-006) y no se podrían limpiar. Tampoco envía sugerencias, que llegarían al panel del staff.
   - El script se niega a correr contra una dirección que no sea local si no se le pasa `-e ACEPTO_DATOS_DE_PRUEBA=si`.
   - Al terminar, una persona del equipo borra las cuentas `k6-%` con la consulta de `tests/carga/README.md`; el borrado en cascada se lleva sus desahogos, riegos, sesiones, historial y avisos.
   - No se ejecuta durante una demostración.
   - **Cuando haya personas reales, la carga pasa a un entorno aparte** (otro servicio de Railway con su propio proyecto de Supabase y su propia `Cifrado__Llave`). Este punto del ADR se revisa entonces.
6. **Informe:** los resultados de cada corrida se registran en `docs/pruebas/informe-tec-05.md` (DoD nivel 2: "los RNF de rendimiento del sprint se midieron y registraron").

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| JMeter | Suma Java y planes en XML, y una interfaz gráfica pesada; no da nada que k6 no dé para este caso |
| Medir la carga con xUnit y `HttpClient` | Sin cambiar las reglas de estructura, pero habría que programar a mano las rampas, los percentiles y las metas; la medición queda artesanal y más difícil de leer |
| NBomber (C#) | Mantiene todo en C#, pero es un paquete con licencia comercial para organizaciones y menos conocido que k6 |
| Probar la seguridad solo con k6 | k6 no ve los logs ni la base de datos: no puede comprobar que el texto no se registre ni que se guarde cifrado |
| Entorno de pruebas aparte desde ya | Lo correcto con personas reales; hoy suma un servicio y una base que mantener sin un beneficio real |

## Consecuencias

- **Positivas:** los RNF de rendimiento quedan medidos con percentiles sobre el entorno real (red, Railway y Supabase incluidos). La autorización de cada ruta y la privacidad de los desahogos quedan protegidas por la CI de aquí en adelante.
- **Negativas:** el repositorio admite JavaScript en `tests/carga/` (solo ahí). Quien ejecute la carga necesita k6 instalado. Medir sobre producción mezcla, durante la corrida, cuentas de prueba con las del equipo, y deja filas de prueba hasta que se limpien.
- **Riesgo conocido:** registro e inicio de sesión son lo más costoso para el CPU (PBKDF2, ADR-005). Si no cumplen el 0,5 s de promedio, la decisión es subir el plan de Railway o revisar el ADR-005; bajar las iteraciones afecta la seguridad.
- **Cómo se verifica:** `EstructuraDelRepositorioTests` (solo `.js` y `README.md` en `tests/carga/`), `Treeve.Api.Tests` en la CI y el informe de cada corrida.
