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
  bandeja: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  alerta: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  verificado: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6',
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  panel: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  flechaIzq: 'M15 5l-7 7 7 7',
  flechaDer: 'M9 5l7 7-7 7',
  idea: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  campana: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.730 21a2 2 0 0 1-3.460 0',
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
