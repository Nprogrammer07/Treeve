import estilos from './Formularios.module.css'

interface Props {
  id: string
  etiqueta: string
  marca?: 'obligatorio' | 'opcional'
  ayuda?: string
  error?: string
  valor: string
  onCambio: (valor: string) => void
  multilinea?: boolean
  type?: string
  autoComplete?: string
  placeholder?: string
  maxLength?: number
}

/** Campo de formulario accesible: etiqueta, ayuda y error enlazados con aria-describedby. */
export function Campo({ id, etiqueta, marca, ayuda, error, valor, onCambio, multilinea, type = 'text', autoComplete, placeholder, maxLength }: Props) {
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined
  const comunes = {
    id,
    value: valor,
    placeholder,
    autoComplete,
    maxLength,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': marca === 'obligatorio' ? true : undefined,
    className: estilos.control,
  }
  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
        {marca === 'obligatorio' && <span aria-hidden="true"> *</span>}
        {marca === 'opcional' && <span className={estilos.opcional}> (Opcional)</span>}
      </label>
      {multilinea ? (
        <textarea {...comunes} rows={3} onChange={(e) => onCambio(e.target.value)} />
      ) : (
        <input {...comunes} type={type} onChange={(e) => onCambio(e.target.value)} />
      )}
      {ayuda && (
        <p id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className={estilos.error}>
          {error}
        </p>
      )}
    </div>
  )
}
