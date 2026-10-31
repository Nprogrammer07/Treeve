import { useState } from 'react'
import { PanelSugerencias } from '../features/panel-staff/PanelSugerencias.tsx'
import estilos from './BancoStaff.module.css'
import { crearFuenteDeMuestra } from './sugerenciasDeMuestra.ts'

/**
 * Solo desarrollo (abrir /#staff): muestra el panel de staff completo con 1.240 sugerencias de ejemplo.
 * Sirve para revisar el diseño y probar filtros y paginación mientras no exista la API (HU-09, HU-10, HU-11).
 */
export default function BancoStaff() {
  const [fuente] = useState(() => crearFuenteDeMuestra())

  return (
    <>
      <p className={estilos.aviso}>Banco de pruebas: sugerencias de ejemplo generadas en el navegador. Incluye resumen y cambio de estado, que la API real aún no ofrece. Solo existe en desarrollo.</p>
      <PanelSugerencias fuente={fuente} apodo="Juan José" onSalir={() => window.location.assign('/')} onAdministracion={() => {}} />
    </>
  )
}
