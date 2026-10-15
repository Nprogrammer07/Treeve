## Historia

<!-- ID del backlog y enlace a la tarea de ClickUp. Un PR = una historia (o una parte de ella). -->
**ID:** HU-xx / TEC-xx · [Tarea en ClickUp](https://app.clickup.com/t/)

## Qué cambia

<!-- Resumen breve. Qué criterio de aceptación (RF/RNF) cubre este PR. -->

## Cómo probarlo

<!-- Pasos para que otra persona lo verifique en local o en el entorno desplegado. -->

## Checklist de arquitectura

- [ ] ¿Respeta la regla de dependencias del Onion (todo apunta hacia el centro)? (CI en verde, incluidas `Treeve.ArchitectureTests` y `npm run depcruise`)
- [ ] ¿Cada pieza está en su anillo? (reglas de negocio en `Domain`/`Domain.Services`, orquestación en `Application`, nada de lógica de negocio en endpoints ni en el frontend)
- [ ] ¿La autorización está en el caso de uso (validada en el backend)?
- [ ] ¿Los eventos llevan solo IDs y metadatos, nunca el texto del desahogo?
- [ ] ¿Hay pruebas de las reglas de negocio y pasan?
- [ ] ¿Algún cambio merece un ADR nuevo o actualizado? (Enlázalo si aplica)

## Definition of Done (nivel historia)

- [ ] Cumple sus criterios de aceptación RF y RNF
- [ ] El texto de los desahogos no aparece en logs, eventos, mensajes de error ni respuestas de staff
- [ ] No se persiste el tema detectado por el motor de respuestas
- [ ] Sin secretos en el código
- [ ] Si tiene interfaz: usable con teclado y con etiquetas ARIA
- [ ] Si cambia la base de datos: migración versionada incluida
- [ ] Desplegada y funcionando en el entorno compartido
- [ ] Revisado por otra persona del equipo
