# Pruebas de carga con k6 (TEC-05)

Decisión y reglas: [ADR-009](../../docs/adr/ADR-009-pruebas-de-carga-y-seguridad.md). Los resultados se registran en [informe-tec-05.md](../../docs/pruebas/informe-tec-05.md).

`treeve.js` simula personas que entran a su espacio verde, miran sus avisos, se desahogan (con pausas para elegir la emoción y escribir), leen el mensaje de apoyo y vuelven a ver su lote. Aparte, a ritmo fijo, inicia sesiones para medir el costo del hash de contraseñas (PBKDF2, ADR-005).

## Metas

Si una no se cumple, k6 lo marca con ✗ y termina con error.

| Medida | Meta | Origen |
|---|---|---|
| `guardar_desahogo` (guardar y recibir el mensaje de apoyo) | p95 < 2 s | HU-06, ADR-001 |
| Rutas de la persona usuaria (`meta:promedio`) | promedio < 0,5 s | CLAUDE.md, sección 4 |
| `http_req_failed` | < 1 % | — |
| `checks` | > 99 % | — |
| `iniciar_sesion` y `registro` | se miden, sin meta propia | ADR-009 |

## Antes de empezar

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado (`k6 version`).
- **Treeve no debe tener personas reales en la base** (ADR-009, punto 5). Cuando las tenga, esto se corre en un entorno aparte.
- No lo ejecutes durante una demostración.
- La prueba **crea cuentas `k6-<corrida>-<n>`** con textos inventados. No usa las rutas de staff ni de administración, ni envía sugerencias.
- Contra una dirección que no sea local, el script exige `-e ACEPTO_DATOS_DE_PRUEBA=si`.

## Ejecutar

Desde la raíz del repositorio. Primero el perfil **humo** (una persona, una vuelta) para comprobar que todo responde:

```bash
k6 run -e BASE_URL=https://treeve-production.up.railway.app -e ACEPTO_DATOS_DE_PRUEBA=si -e PERFIL=humo tests/carga/treeve.js
```

Si todo sale con ✓, el perfil **carga**: el pico de diseño, 100 personas a la vez durante 10 minutos (unos 13 minutos en total con las rampas):

```bash
k6 run -e BASE_URL=https://treeve-production.up.railway.app -e ACEPTO_DATOS_DE_PRUEBA=si -e PERFIL=carga tests/carga/treeve.js
```

Opcional, el perfil **estres**: sube a 200 personas para ver dónde está el límite. Es normal que alguna meta falle aquí; lo que interesa es en qué punto empieza a fallar:

```bash
k6 run -e BASE_URL=https://treeve-production.up.railway.app -e ACEPTO_DATOS_DE_PRUEBA=si -e PERFIL=estres tests/carga/treeve.js
```

Para probar el script en local, contra la API en `http://localhost:5000` (o el puerto que uses), no hace falta `ACEPTO_DATOS_DE_PRUEBA`.

### Variables opcionales

| Variable | Por defecto | Qué cambia |
|---|---|---|
| `PERSONAS` | 100 | Personas a la vez en el pico (el 5 % de 2000 registradas) |
| `ESTRES` | 200 | Personas a la vez en la etapa de estrés |
| `DURACION` | `10m` | Cuánto se sostiene el pico |
| `LOGINS_POR_SEGUNDO` | 1 | Inicios de sesión por segundo durante el pico |
| `PAUSA` | 1 (humo: 0,02) | Multiplica las pausas de lectura y escritura; con menos pausa, más carga |

Se agregan con otro `-e`, por ejemplo `-e PERSONAS=50 -e DURACION=5m`.

## Leer el resultado

Al final k6 imprime dos bloques:

- **THRESHOLDS:** cada meta con ✓ o ✗ y el valor medido.
- **HTTP:** la duración de las peticiones (`avg` es el promedio y `p(95)` el tiempo dentro del cual respondió el 95 %), separada por ruta: `guardar_desahogo`, `meta:promedio`, `iniciar_sesion` y `registro`.

Copia esos dos bloques en el [informe](../../docs/pruebas/informe-tec-05.md), con la fecha, el perfil y el plan de Railway.

Para guardar el resultado completo en un archivo, agrega `--summary-export` con una ruta **fuera del repositorio** (por ejemplo, tu carpeta de descargas).

## Limpiar al terminar

Cada corrida deja sus cuentas `k6-<corrida>-<n>` en la base (k6 lo recuerda al final). Una persona del equipo con acceso a Supabase las borra desde el editor SQL. Primero, para ver cuántas son:

```sql
select count(*) from treeve.usuarios where nombre_de_usuario like 'k6-%';
```

Y después, para borrarlas:

```sql
delete from treeve.usuarios where nombre_de_usuario like 'k6-%';
```

El borrado en cascada se lleva sus credenciales, sesiones, desahogos, riegos, historial de respuestas y avisos. Las cuentas reales nunca empiezan con `k6-` si nadie las crea así a propósito: revisa el conteo antes de borrar.
