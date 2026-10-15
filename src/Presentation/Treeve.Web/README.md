# Treeve.Web · Presentación web

Stack: **React + TypeScript + PixiJS** (renderizado 2.5D) ([ADR-003](../../../docs/adr/ADR-003-stack-tecnologico.md)). Para compilar, probar y verificar se usan herramientas que no forman parte del stack: Vite, Vitest, Oxlint y dependency-cruiser.

Este proyecto es **presentación**, en el **anillo externo** de la Onion Architecture ([ADR-004](../../../docs/adr/ADR-004-onion-architecture.md)), al mismo nivel que `Treeve.Api`. Depende del núcleo solo a través de la API HTTP y **no decide reglas de negocio**: muestra, captura y pide. Guía completa: [docs/guias/frontend.md](../../../docs/guias/frontend.md).

## Estructura

| Carpeta | Contiene | Reglas (dependency-cruiser) |
|---|---|---|
| `src/app` | Composición de la app, rutas, estilos globales | Puede usar todo |
| `src/features/<area>` | Pantallas y estado de UI por área funcional (p. ej. `identidad`, `desahogos`, `espacio-verde`, `sugerencias`, `panel-staff`) | No importa otras features |
| `src/scene` | Escena 2.5D y animaciones | Único lugar que importa PixiJS |
| `src/shared/api` | `clienteApi.ts`: **único punto de contacto con `Treeve.Api`** | — |
| `src/shared` | Componentes base y utilidades | No conoce features, escena ni app |

El frontend nunca consulta la base de datos (ADR-002, punto 1).

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo; reenvía `/api` a `http://localhost:5242` |
| `npm run lint` | Oxlint con reglas de accesibilidad (`jsx-a11y`) en modo error |
| `npm run depcruise` | Verifica las reglas de dependencias |
| `npm test` | Pruebas con Vitest y Testing Library |
| `npm run build` | Chequeo de tipos y build de producción |
| `npm run check` | Todo lo anterior, igual que la CI |
