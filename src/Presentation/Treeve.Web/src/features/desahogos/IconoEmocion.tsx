import type { ReactNode } from 'react'
import type { Emocion } from './tipos.ts'

// Rostros dibujados a mano en SVG propio (sin licencias de terceros).
// Son decorativos: el nombre de la emoción siempre va escrito al lado (HU-04).
const OJOS = (
  <>
    <circle cx="17" cy="21" r="1.9" fill="currentColor" />
    <circle cx="31" cy="21" r="1.9" fill="currentColor" />
  </>
)

const ROSTROS: Record<Emocion, ReactNode> = {
  felicidad: (
    <>
      {OJOS}
      <path d="M15 28 Q24 38 33 28" />
    </>
  ),
  tristeza: (
    <>
      {OJOS}
      <path d="M16 35 Q24 27 32 35" />
      <circle cx="16" cy="28" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  rabia: (
    <>
      <path d="M12 14 L21 18 M36 14 L27 18" />
      <circle cx="17" cy="23" r="1.9" fill="currentColor" />
      <circle cx="31" cy="23" r="1.9" fill="currentColor" />
      <path d="M17 34 L31 34" />
    </>
  ),
  miedo: (
    <>
      <path d="M12 13 Q17 9 21 13 M27 13 Q31 9 36 13" />
      <circle cx="17" cy="21" r="3.2" />
      <circle cx="31" cy="21" r="3.2" />
      <ellipse cx="24" cy="33" rx="3" ry="4" />
    </>
  ),
  duda: (
    <>
      {OJOS}
      <path d="M27 13 Q31 10 36 13" />
      <path d="M15 33 q4.5 -4 9 0 t9 0" />
    </>
  ),
}

export function IconoEmocion({ emocion }: { emocion: Emocion }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="24" cy="24" r="20" />
      {ROSTROS[emocion]}
    </svg>
  )
}
