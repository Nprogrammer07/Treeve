# Informe de TEC-05 · Pruebas de carga y de seguridad

Registro de las mediciones de los RNF de rendimiento y de las verificaciones de seguridad de la versión 1 (DoD, nivel 2: "los RNF de rendimiento del sprint se midieron y registraron"). Decisión y reglas: [ADR-009](../adr/ADR-009-pruebas-de-carga-y-seguridad.md). Arquitectura medida: [modelo C4](../arquitectura/c4.md).

## 1. Seguridad (automática, en cada PR)

`tests/Treeve.Api.Tests` levanta la API completa como en producción y corre en la CI contra un PostgreSQL de usar y tirar. Primera corrida: **3 de noviembre de 2026, 10 de 10 en verde.**

| RNF | Qué se comprueba | Prueba |
|---|---|---|
| HU-10 · RBAC en cada petición | Solo 6 rutas son públicas (registro, inicio de sesión, recuperación y salud); cualquier otra que aparezca sin sesión hace fallar la CI | `Solo_las_rutas_de_registro_inicio_de_sesion_recuperacion_y_salud_son_publicas` |
| HU-10 | Toda ruta privada responde 401 sin sesión o con un token inventado | `Toda_ruta_privada_responde_401_sin_sesion_o_con_un_token_inventado` |
| HU-10 · Auditoría | Una persona usuaria recibe 403 en cada ruta de staff y de administración, y cada intento queda en `auditoria_accesos` | `Una_persona_usuaria_recibe_403_en_staff_y_administracion_y_cada_intento_queda_en_la_auditoria` |
| HU-12 | El staff entra a su zona pero recibe 403 en cada ruta de administración | `El_staff_entra_a_su_zona_pero_recibe_403_en_administracion` |
| HU-05 · Solo la persona dueña | Otra persona, el staff y la administración reciben 403 al pedir un desahogo ajeno | `Solo_la_persona_duena_puede_leer_su_desahogo` |
| HU-05 · Respuestas de staff | El texto de un desahogo no aparece en ninguna consulta de staff ni de administración | `El_texto_del_desahogo_no_sale_en_ninguna_consulta_del_staff_ni_de_la_administracion` |
| HU-05 · Cifrado en reposo y privacidad | El texto no está en claro en ninguna columna de ninguna tabla, ni en ningún nivel del log, ni en las respuestas de error (también con texto de crisis y con texto inválido) | `El_texto_del_desahogo_se_guarda_cifrado_y_nunca_aparece_en_el_log_ni_en_los_errores` |
| HU-03a | El error de inicio de sesión es el mismo si falla el usuario o la contraseña | `El_error_de_inicio_de_sesion_no_dice_que_dato_fallo` |
| HU-03a | Tras 5 intentos fallidos la cuenta se bloquea (429 con `Retry-After`), aunque la contraseña sea correcta | `Tras_5_intentos_fallidos_la_cuenta_se_bloquea_aunque_la_contrasena_sea_correcta` |
| HU-02 · HTTPS/TLS | La API rechaza `/api` por HTTP y manda HSTS | `La_API_rechaza_las_peticiones_sin_HTTPS_y_manda_HSTS` |

Comprobación de que las pruebas detectan fallas: al quitar a propósito `RequireAuthorization()` de `GET /api/espacio-verde`, la CI falla y nombra la ruta.

## 2. Rendimiento (k6, a mano)

Script y forma de ejecutarlo: [tests/carga](../../tests/carga/README.md).

### Metas

| Medida | Meta | Origen |
|---|---|---|
| Guardar un desahogo y recibir el mensaje de apoyo | p95 < 2 s | HU-06, ADR-001 |
| Resto de rutas de la persona usuaria | promedio < 0,5 s | CLAUDE.md, sección 4 |
| Peticiones fallidas | < 1 % | — |
| Inicio de sesión y registro | se miden, sin meta propia | ADR-009 |

### Carga de diseño

2000 personas registradas, de las que 100 están activas a la vez en el pico (5 %, uso nocturno). Cada persona virtual entra, mira su espacio verde y sus avisos, tarda de 20 a 45 s en escribir, se desahoga, lee el mensaje, vuelve a ver su lote y se queda de 30 a 90 s. Cada vuelta dura unos 100 s, así que con 100 personas es cerca de 1 desahogo por segundo: unas 5 veces lo que generarían 2000 personas escribiendo una vez cada noche en una franja de 3 horas (0,19 por segundo).

### Corridas

<!-- Una fila por corrida. Copiar los valores del bloque HTTP del resumen de k6. -->

| Fecha | Perfil | Entorno | Personas | `guardar_desahogo` p95 | `meta:promedio` promedio | `iniciar_sesion` p95 | Fallidas | ¿Metas? |
|---|---|---|---|---|---|---|---|---|
| 2026-11-03 | carga corta (validación del script) | Local (portátil + PostgreSQL local) | 20 | 10,58 ms | 2,43 ms | 74,51 ms | 0 % | ✓ |
| | humo | Railway + Supabase | 1 | | | | | |
| | carga | Railway + Supabase | 100 | | | | | |
| | estrés (opcional) | Railway + Supabase | 200 | | | | | |

La corrida local solo valida que el script funciona: no tiene red, ni Railway, ni Supabase, así que **no cuenta como medición del RNF**.

### Plan de Railway durante la medición

<!-- CPU y memoria del servicio de la API en Railway, y plan de Supabase, el día de la corrida. -->

### Conclusiones

<!-- ¿Se cumplen las metas con la carga de diseño? ¿Dónde empieza a fallar en estrés? ¿Qué ruta es la más lenta? -->

### Limpieza

<!-- Fecha y cantidad de cuentas k6-% borradas (ver tests/carga/README.md). -->
