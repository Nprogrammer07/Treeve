# ADR-006 · Gestión de staff, auditoría inmutable y notificaciones

- **Estado:** Aceptado (2026-10-27). Nicolás eligió las tres opciones de alcance, notificación y roles; el resto se deriva de ellas.
- **Fecha:** 2026-10-27
- **Decisores:** Nicolás (arquitecto y PO)
- **Historias relacionadas:** HU-12, HU-10, TEC-03

## Contexto

HU-12 pide que un administrador liste el staff, ascienda a un usuario registrado, le revoque el rol y que se le notifique a la persona. Su RNF de seguridad exige que solo un administrador cambie roles, validado en el backend, y un **log de auditoría inmutable** con administrador, usuario afectado, rol anterior, rol nuevo y marca de tiempo.

Ya existen los roles y su validación en cada petición (HU-10, ADR-005), la auditoría de accesos denegados y el bus de eventos en memoria (TEC-03). No hay servicio de correo, el correo es opcional al registrarse y no se agregan tecnologías al stack sin ADR.

## Decisión

1. **Qué se gestiona.** Desde la API solo se asciende a staff a un usuario regular o se le quita el staff a quien lo tiene. El rol de un administrador no se cambia desde la aplicación: se asigna con SQL, como hasta ahora. Un administrador no puede cambiar su propio rol. Las reglas viven en el dominio (`Usuario.AscenderAStaff`, `Usuario.RevocarStaff` y `CambioDeRol.Registrar`).
2. **Autorización doble.** Las rutas `/api/admin` llevan el filtro `RequiereRol(Rol.Administrador)`, y además cada caso de uso (`ListarStaff`, `AscenderAStaff`, `RevocarStaff`, `ConsultarAuditoria`) llama a `AutorizarAcceso` por su cuenta. Así la regla no depende de la ruta. Cada intento sin permiso queda en `auditoria_accesos`.
3. **El cambio y su registro, en una sola transacción.** `IRepositorioCambiosDeRol.Registrar` guarda el nuevo rol y la fila de `auditoria_roles` con un solo `SaveChanges`. Nunca hay un cambio de rol sin su registro, ni un registro de un cambio que no ocurrió.
4. **Log inmutable, garantizado por la base de datos.** `auditoria_roles` (HU-12) y `auditoria_accesos` (HU-10) tienen un trigger que rechaza todo `UPDATE`, `DELETE` y `TRUNCATE`: solo se pueden agregar filas, venga el intento de la aplicación o de alguien con acceso a Supabase. Se aplica con `ProteccionDeTablas.HacerInmutable` en la migración. Ninguna de las dos tablas tiene llave foránea a `usuarios`, para que el registro no desaparezca si se borra a la persona.
5. **Notificación dentro de la aplicación, por evento.** Al cambiar un rol se publica `RolCambiado` (solo ids y roles). El área nueva **Notificaciones** lo escucha (`AlCambiarRol`) y guarda un aviso en `notificaciones`, que la persona lee con `GET /api/notificaciones`. El texto sale del tipo de aviso, en un solo lugar del backend. El manejador es idempotente: `evento_id` es único, así que un evento repetido no avisa dos veces.
6. **Logs visibles para el administrador.** `GET /api/admin/auditoria/roles` y `GET /api/admin/auditoria/accesos`, solo de lectura y paginados con `limite`, `desplazamiento` y `hayMas`, como el listado de sugerencias.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Notificar por correo | Exige un proveedor de correo (tecnología nueva) y solo llega a quien registró su correo, que es opcional |
| Permitir nombrar administradores desde la API | Abre la escalada de privilegios y exige reglas para no quedarse sin administradores; HU-12 solo pide gestionar staff |
| Guardar el log por evento, después del cambio | El bus en memoria no reintenta: el cambio podría quedar sin registro. El log va en la misma transacción |
| Inmutabilidad solo en el código (el puerto sin `Actualizar` ni `Borrar`) | Protege de errores de programación, pero no de cambios directos en la base de datos; el RNF pide un log inmutable |
| Llave foránea del log a `usuarios` | Borrar a una persona borraría o bloquearía su historia de auditoría |

## Consecuencias

- **Positivas:** HU-12 queda cubierta con piezas que ya existían (roles, `AutorizarAcceso`, bus de eventos). El área Notificaciones queda lista para otros avisos sin tocar Identidad ni Administración, lo que favorece la modificabilidad.
- **Negativas:**
  - Un superusuario de la base de datos puede quitar el trigger a propósito. Eso exige una acción deliberada, que además quedaría en el historial de migraciones o en los registros de Supabase.
  - Si el manejador de la notificación falla, el cambio y su registro ya quedaron, pero la persona no recibe el aviso: el bus en memoria no reintenta (TEC-03).
  - El primer administrador se sigue asignando con SQL.

## Verificación

- **Pruebas de dominio:** reglas de ascenso y revocación, registro de auditoría, evento y notificación.
- **Pruebas de aplicación:** solo un administrador gestiona y lee los logs, los intentos sin permiso quedan auditados, el cambio y su registro se guardan juntos, la paginación funciona y la notificación es idempotente y solo la ve su dueña.
- **`EventosDeDominioTests`:** también vigila que `RolCambiado` lleve solo ids y metadatos.
- **Prueba de punta a punta en una base PostgreSQL local** (2026-10-27): migración aplicada, flujo completo de ascender, notificar, marcar como leída, revocar y leer los logs, y los 6 intentos de `UPDATE`, `DELETE` y `TRUNCATE` sobre los dos logs rechazados por el trigger.
