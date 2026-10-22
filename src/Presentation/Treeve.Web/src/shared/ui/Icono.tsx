// Íconos propios de Treeve (trazos simples dibujados para este proyecto, sin librerías de terceros).
const TRAZOS = {
  hoja: 'M5 19C5 10 11 5 20 4c0 9-5 15-14 15zM5 19l8-8',
  chispas: 'M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8zM19 15v5M16.5 17.5h5',
  gota: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  ave: 'M3 13c4 0 6-3 9-5 2-1.5 5-.5 6 2l3 1-3 1.5c-1 3-4 5.5-8 5.5-4 0-7-2-7-5zM16 10.5h.01',
  lluvia: 'M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5A3.500 3.500 0 0 1 17.500 15H7zM9 18v2M13 18v3M17 18v2',
  olas: 'M3 8q3-3 6 0t6 0t6 0M3 13q3-3 6 0t6 0t6 0M3 18q3-3 6 0t6 0t6 0',
  bosque: 'M12 3l5 8h-3l4 6H6l4-6H7zM12 17v4',
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  cerrar: 'M6 6l12 12M18 6L6 18',
  masCirculo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8',
  altavoz: 'M4 10v4h4l5 4V6l-5 4zM16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11',
} as const

export type NombreIcono = keyof typeof TRAZOS

/** Decorativo: el significado siempre va escrito al lado, por eso está oculto para lectores de pantalla. */
export function Icono({ nombre, tamano = 20 }: { nombre: NombreIcono; tamano?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}
