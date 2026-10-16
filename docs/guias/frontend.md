# Guía del frontend · La presentación web en la Onion Architecture

Para: desarrollador frontend de Treeve (Luis) y quien toque `Treeve.Web`.
Supone que conoces la teoría de Onion y Clean Architecture; aquí se explica **qué significa para el frontend** en este repositorio. La decisión completa está en [ADR-004](../adr/ADR-004-onion-architecture.md).

---

## Stack y herramientas

- **Stack (con lo que escribes el código):** React + TypeScript, y PixiJS para el renderizado 2.5D. No se agregan otras librerías de UI ni frameworks sin un ADR.
- **Herramientas (no son parte del stack, no programas "en" ellas):**
  - Vite compila TypeScript/JSX y empaqueta la app para el navegador, y la sirve en desarrollo.
  - `tsc` verifica los tipos.
  - Vitest + Testing Library corren las pruebas.
  - Oxlint revisa el código y la accesibilidad.
  - dependency-cruiser verifica la regla de dependencias.

  Todas se ejecutan con los scripts de npm (`npm run dev`, `npm run check`).

---

## 1. Antes de empezar

1. Instala [Node.js 24](https://nodejs.org/) y el [.NET SDK 10](https://dotnet.microsoft.com/download) (para levantar la API en local).
2. Instala las dependencias del frontend:

   ```bash
   npm --prefix src/Presentation/Treeve.Web install
   ```

3. La API necesita la cadena de conexión de la base de **desarrollo**; sin ella no arranca. Pídesela a Juan José por un canal privado y guárdala una sola vez en tus secretos locales, que quedan fuera del repositorio:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Treeve" "<cadena de desarrollo>" --project src/Presentation/Treeve.Api
   ```

4. En una terminal, levanta la API:

   ```bash
   dotnet run --project src/Presentation/Treeve.Api
   ```

5. En otra terminal, levanta el frontend y abre `http://localhost:5173`:

   ```bash
   npm --prefix src/Presentation/Treeve.Web run dev
   ```

   El servidor de desarrollo (Vite) reenvía toda llamada a `/api/...` hacia la API (`http://localhost:5242`), así que en el código siempre se usan rutas relativas como `/api/desahogos`.

---

## 2. Dónde está el frontend en la arquitectura

El frontend es **presentación** y vive en el **anillo externo**, al mismo nivel que `Treeve.Api` y la infraestructura. Por eso está en `src/Presentation/Treeve.Web`, al lado de la API.

```
                 ┌──────────────────────── Anillo externo ─────────────────────────┐
  Usuario  →     │  Treeve.Web (React)  ──HTTP──▶  Treeve.Api (endpoints)          │
                 │                                       │                         │
                 │                       ┌───────────────▼──────────────┐          │
                 │                       │ Núcleo: Application → Domain │          │
                 │                       └──────────────────────────────┘          │
                 └─────────────────────────────────────────────────────────────────┘
```

Esto tiene tres consecuencias prácticas:

1. **Las dependencias apuntan hacia adentro.** El frontend depende del núcleo solo a través del **contrato HTTP** de `Treeve.Api` (rutas y DTOs). El núcleo no sabe que el frontend existe.
2. **El frontend no decide reglas de negocio.** Muestra, captura y pide. Si un dato depende de una regla (la etapa del árbol, si un mensaje es de crisis, si alguien es staff), lo calcula el backend y el frontend lo pinta.
3. **Hay un solo punto de contacto con el backend:** `src/shared/api/clienteApi.ts`. Ningún componente llama a `fetch` directamente.

### Qué hace y qué no hace el frontend

| El frontend sí | El frontend no |
|---|---|
| Mostrar pantallas, escena 2.5D, animaciones y sonido | Calcular el crecimiento del árbol, umbrales o etapas (HU-07a es del backend) |
| Capturar datos y validar **para la experiencia** (campo vacío, contador de caracteres) | Ser la única validación: el backend siempre vuelve a validar |
| Ocultar opciones que el usuario no puede usar | Decidir permisos o roles: la autorización está en los casos de uso |
| Mostrar el mensaje de apoyo que devuelve la API | Armar mensajes de apoyo ni detectar crisis (ADR-001 es del backend) |
| Llamar a la API con `clienteApi.ts` | Consultar la base de datos o usar el SDK de Supabase (dependency-cruiser lo bloquea) |
| Guardar preferencias de interfaz (volumen, sonido elegido) | Guardar el texto de un desahogo en `localStorage`, `sessionStorage` ni en logs |

---

## 3. Estructura interna

```
src/Presentation/Treeve.Web/src/
├── app/                 # Composición: App, rutas, estilos globales
├── features/            # Una carpeta por área funcional
│   ├── identidad/       #   registro, login (HU-02, HU-03a)
│   ├── desahogos/       #   emoción y hoja de papel (HU-04, HU-05)
│   ├── espacio-verde/   #   pantalla del árbol (HU-07b)
│   ├── sugerencias/     #   HU-09
│   └── panel-staff/     #   HU-10, HU-11, HU-12 (separado visualmente)
├── scene/               # Escena 2.5D: único lugar que importa PixiJS
└── shared/
    ├── api/             # clienteApi.ts: único punto de contacto con Treeve.Api
    └── ui/              # Componentes base del sistema de diseño (TEC-07)
```

Las carpetas de `features/` se crean cuando se empieza cada historia. Dentro de una feature, este es el orden recomendado:

| Archivo | Responsabilidad |
|---|---|
| `tipos.ts` | Tipos que reflejan los DTOs de la API (request/response) |
| `api.ts` | Funciones que llaman a la API con `pedirApi` |
| `Componente.tsx` | Pantallas y componentes |
| `Componente.test.tsx` | Pruebas del componente |

**Reglas verificadas en CI** (`npm run depcruise`):

- una feature no importa otra (lo compartido va en `shared/`);
- `shared/` no conoce features, escena ni app;
- solo `scene/` importa PixiJS;
- ningún cliente de base de datos (`@supabase/*`, `pg`, `postgres`);
- sin ciclos.

`npm run lint` revisa además la accesibilidad (`jsx-a11y`): una imagen sin `alt` o un `div` con `onClick` sin teclado hacen fallar la CI.

Además, la CI del backend (`EstructuraDelRepositorioTests`) revisa los archivos del frontend:
- en `src/` solo puede haber TypeScript (`.ts`, `.tsx`), CSS y recursos (imágenes, sonidos, fuentes, JSON);
- los archivos de configuración de la raíz de `Treeve.Web` son una lista cerrada.

Agregar dependencias a `package.json` o cambiar la configuración de lint y dependencias requiere la aprobación del arquitecto (`.github/CODEOWNERS`).

---

## 4. Ejemplo guiado: HU-05 · Hoja de papel

Este código **pasa lint, reglas de dependencias, pruebas y build** con la estructura actual. Es el lado web del ejemplo de la [guía del backend](backend.md#4-ejemplo-guiado-hu-05--guardar-un-desahogo) (`POST /api/desahogos`). Úsalo como referencia, revisando los criterios de la historia y el diseño de TEC-07.

`src/features/desahogos/tipos.ts` refleja el contrato de la API. Si el backend cambia el DTO, se cambia aquí.

```ts
// Espejo de los DTOs de Treeve.Api (Endpoints/Desahogos). Si cambia la API, cambia aquí.
export const EMOCIONES = ['tristeza', 'rabia', 'miedo', 'duda', 'felicidad'] as const

export type Emocion = (typeof EMOCIONES)[number]

export interface CrearNotaRequest {
  emocion: Emocion
  texto: string
}

export interface CrearNotaResponse {
  notaId: string
  creadaEn: string
}
```

`src/features/desahogos/api.ts` pasa siempre por el cliente compartido:

```ts
import { pedirApi } from '../../shared/api/clienteApi.ts'
import type { CrearNotaRequest, CrearNotaResponse } from './tipos.ts'

export function guardarDesahogo(datos: CrearNotaRequest): Promise<CrearNotaResponse> {
  return pedirApi<CrearNotaResponse>('/api/desahogos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}
```

`src/features/desahogos/HojaDePapel.tsx` es presentación pura: valida para la experiencia, pero quien decide es la API.

```tsx
import { useState, type FormEvent } from 'react'
import { guardarDesahogo } from './api.ts'
import type { Emocion } from './tipos.ts'

// Ayuda de UX. Quien decide el límite es el backend (TextoDesahogo.LongitudMaxima).
const LONGITUD_MAXIMA = 2000

interface Props {
  emocion: Emocion
  onGuardado: () => void
}

export function HojaDePapel({ emocion, onGuardado }: Props) {
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError(false)
    try {
      await guardarDesahogo({ emocion, texto })
      setTexto('')
      onGuardado()
    } catch {
      // Sin console.log: el error viaja junto al texto del desahogo.
      setError(true)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar}>
      <label htmlFor="desahogo">Escribe lo que sientes</label>
      <textarea
        id="desahogo"
        value={texto}
        maxLength={LONGITUD_MAXIMA}
        aria-describedby="contador"
        onChange={(e) => setTexto(e.target.value)}
      />
      <p id="contador">
        {texto.length} / {LONGITUD_MAXIMA}
      </p>
      {error && <p role="alert">No pudimos guardar tu desahogo. Inténtalo de nuevo en un momento.</p>}
      <button type="submit" disabled={guardando || texto.trim() === ''}>
        Guardar
      </button>
    </form>
  )
}
```

`src/features/desahogos/HojaDePapel.test.tsx` prueba lo que ve el usuario. Se busca por rol y etiqueta, como lo haría un lector de pantalla, y se simula la API.

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { guardarDesahogo } from './api.ts'
import { HojaDePapel } from './HojaDePapel.tsx'

vi.mock('./api.ts', () => ({
  guardarDesahogo: vi.fn<typeof guardarDesahogo>().mockResolvedValue({ notaId: 'n-1', creadaEn: '2026-10-14T22:30:00-05:00' }),
}))

describe('HojaDePapel', () => {
  it('no deja guardar una hoja vacía', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('muestra cuántos caracteres lleva', () => {
    render(<HojaDePapel emocion="tristeza" onGuardado={() => {}} />)

    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'hola' } })

    expect(screen.getByText('4 / 2000')).toBeInTheDocument()
  })

  it('envía la emoción y el texto a la API y avisa al terminar', async () => {
    const onGuardado = vi.fn<() => void>()
    render(<HojaDePapel emocion="rabia" onGuardado={onGuardado} />)

    fireEvent.change(screen.getByLabelText('Escribe lo que sientes'), { target: { value: 'texto de prueba' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onGuardado).toHaveBeenCalledOnce())
    expect(guardarDesahogo).toHaveBeenCalledWith({ emocion: 'rabia', texto: 'texto de prueba' })
  })
})
```

> Oxlint exige poner el tipo a los `vi.fn()` (`vi.fn<() => void>()`). Si ves el error `require-mock-type-parameters`, es eso.

---

## 5. La escena 2.5D (PixiJS)

- PixiJS se instala con el *spike* de HU-07b (`npm install pixi.js`) y **solo se importa dentro de `src/scene/`**.
- La escena expone una API pequeña y sin reglas de negocio. Por ejemplo, un componente `<EspacioVerde etapa="tallo" />` y una función `regar()` para la animación. La etapa la calcula el backend (HU-07a) y la escena solo la dibuja.
- Las features usan la escena por esa API pública, sin conocer PixiJS. Si mañana se cambia de motor, solo cambia `src/scene/`.
- Presupuesto de rendimiento: ≥ 30 FPS en gama media y carga < 4 s en 10 Mbps. Mídelo en el spike y registra el resultado en el PR.

---

## 6. Accesibilidad y guía visual (resumen de CLAUDE.md, sección 12)

- Todo se usa con teclado. El foco es visible (ya está en `app/global.css`) y no se usan `tabIndex` positivos.
- Cada campo tiene `<label>` y cada ícono tiene texto alternativo o `aria-label`. La emoción nunca depende solo del color: lleva ícono y texto (HU-04).
- Contraste ≥ 4.5:1 y objetivos táctiles ≥ 44 px. Diseño mobile-first a 390 px.
- Fondo nunca blanco puro, sin rojos de alerta: los errores van en ámbar suave con texto amable, y las transiciones duran entre 300 y 500 ms.
- Tipografía redondeada en la interfaz; manuscrita solo para el mensaje de apoyo.
- Recursos de terceros solo con licencia libre, registrada en el repositorio.
- El panel de staff se ve claramente separado y **nunca** muestra textos de desahogos.

---

## 7. Errores comunes

| Error | Por qué está mal | Qué hacer |
|---|---|---|
| `fetch('/api/...')` dentro de un componente | Hay varios puntos de contacto con el backend | Una función en `features/<area>/api.ts` que use `pedirApi` |
| Calcular en el frontend si el árbol sube de etapa | Es una regla de negocio (HU-07a) | Pedirle el estado del árbol a la API y solo dibujarlo |
| Ocultar el panel de staff y darlo por "seguro" | La seguridad está en el backend (HU-10) | Ocultar es UX; la API rechaza igual |
| `console.log(texto)` o guardar el borrador del desahogo en `localStorage` | Viola la privacidad de HU-05 | No registrar ni persistir el texto en el navegador |
| Importar algo de `features/identidad` desde `features/desahogos` | Acopla áreas (dependency-cruiser falla) | Moverlo a `shared/` o componerlo en `app/` |
| `<div onClick>` como botón | No funciona con teclado ni lector de pantalla (lint falla) | Usar `<button>` |
| Importar `pixi.js` en una feature | Acopla la UI al motor (dependency-cruiser falla) | Usar la API de `src/scene` |

---

## 8. Antes de abrir el PR

- [ ] La rama y los commits llevan el ID: `hu-04-emociones`, `HU-04: panel de emociones con ícono y texto`.
- [ ] `npm --prefix src/Presentation/Treeve.Web run check` está en verde (lint, dependencias, pruebas y build).
- [ ] Probaste la pantalla solo con teclado y con zoom al 200 %.
- [ ] Los tipos de `tipos.ts` coinciden con los DTOs de la API (revísalo con quien hizo el endpoint).
- [ ] El texto de los desahogos no aparece en consola, almacenamiento del navegador ni mensajes de error.
- [ ] Completaste la plantilla del PR (checklist de arquitectura y Definition of Done).
