# Registro de decisiones de arquitectura (ADR)

Cada decisión de arquitectura nueva, o cada cambio a una existente, se propone como ADR **antes** de implementarla y se enlaza desde el PR.

| ADR | Título | Estado |
|---|---|---|
| [ADR-001](ADR-001-mensajes-de-apoyo-grafo-de-composicion.md) | Mensajes de apoyo con grafo de composición | Aceptado |
| [ADR-002](ADR-002-persistencia.md) | Persistencia (acceso solo desde el backend, cifrado, organización de tablas, migraciones) | Aceptado |
| [ADR-003](ADR-003-stack-tecnologico.md) | Stack tecnológico | Aceptado |
| [ADR-004](ADR-004-onion-architecture.md) | Onion Architecture | Aceptado |
| [ADR-005](ADR-005-autenticacion-y-sesiones.md) | Autenticación y sesiones | Propuesto |

## Plantilla

```markdown
# ADR-NNN · Título

- **Estado:** Propuesto | Aceptado | Reemplazado por ADR-XXX
- **Fecha:** AAAA-MM-DD
- **Decisores:** …
- **Historias relacionadas:** HU-xx, TEC-xx

## Contexto
Qué problema o driver obliga a decidir (atributos de calidad, restricciones).

## Decisión
Qué se decide, en términos verificables.

## Alternativas consideradas
Opción, por qué se descartó.

## Consecuencias
Positivas, negativas y cómo se verifica (pruebas, CI, métricas).
```
