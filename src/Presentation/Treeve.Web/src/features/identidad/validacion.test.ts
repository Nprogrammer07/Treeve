import { describe, expect, it } from 'vitest'
import { mensajeDeContrasena, validarContrasenaNueva, validarLogin, validarRegistro } from './validacion.ts'

const valido = { nombreCompleto: 'Ana López', apodo: 'Ani', nombreDeUsuario: 'ana.l', contrasena: 'Treeve2026' }

describe('validarRegistro', () => {
  it('acepta los datos mínimos del contrato, sin correo', () => {
    expect(validarRegistro(valido)).toEqual({})
  })

  it('exige nombre, apodo, usuario y contraseña', () => {
    const errores = validarRegistro({ nombreCompleto: ' ', apodo: '', nombreDeUsuario: '', contrasena: '' })

    expect(Object.keys(errores)).toEqual(['nombreCompleto', 'apodo', 'nombreDeUsuario', 'contrasena'])
  })

  it('respeta los largos mínimo y máximo de cada campo', () => {
    expect(validarRegistro({ ...valido, nombreCompleto: 'A' }).nombreCompleto).toBeDefined()
    expect(validarRegistro({ ...valido, nombreCompleto: 'A'.repeat(101) }).nombreCompleto).toBeDefined()
    expect(validarRegistro({ ...valido, apodo: 'A'.repeat(31) }).apodo).toBeDefined()
    expect(validarRegistro({ ...valido, nombreDeUsuario: 'ab' }).nombreDeUsuario).toBeDefined()
    expect(validarRegistro({ ...valido, nombreDeUsuario: 'a'.repeat(31) }).nombreDeUsuario).toBeDefined()
  })

  it('el usuario solo admite letras, números, punto, guion y guion bajo', () => {
    expect(validarRegistro({ ...valido, nombreDeUsuario: 'ana l' }).nombreDeUsuario).toBeDefined()
    expect(validarRegistro({ ...valido, nombreDeUsuario: 'ana@l' }).nombreDeUsuario).toBeDefined()
    expect(validarRegistro({ ...valido, nombreDeUsuario: 'ana_l-2.0' })).toEqual({})
  })

  it.each(['josé', 'ñandú', 'pingüino', 'María', 'cañón', 'Ángel', 'ana€'])('rechaza el usuario "%s" porque lleva tildes, ñ u otros caracteres fuera de [a-z0-9._-]', (usuario) => {
    expect(validarRegistro({ ...valido, nombreDeUsuario: usuario }).nombreDeUsuario).toMatch(/sin tildes ni ñ/)
  })

  it('acepta mayúsculas y espacios en los extremos, porque la API los normaliza a minúsculas', () => {
    expect(validarRegistro({ ...valido, nombreDeUsuario: '  Ana_L-2.0 ' })).toEqual({})
  })

  it('la contraseña pide 8 a 128 caracteres con una letra y un número', () => {
    expect(validarRegistro({ ...valido, contrasena: 'Treeve1' }).contrasena).toBeDefined()
    expect(validarRegistro({ ...valido, contrasena: 'solo-letras' }).contrasena).toBeDefined()
    expect(validarRegistro({ ...valido, contrasena: '12345678' }).contrasena).toBeDefined()
    expect(validarRegistro({ ...valido, contrasena: `a1${'x'.repeat(127)}` }).contrasena).toBeDefined()
    expect(validarRegistro({ ...valido, contrasena: 'Contraseña2026' })).toEqual({})
  })

  it('el correo es opcional, pero si se escribe debe ser válido', () => {
    expect(validarRegistro({ ...valido, correo: '' })).toEqual({})
    expect(validarRegistro({ ...valido, correo: 'no-es-correo' }).correo).toBeDefined()
    expect(validarRegistro({ ...valido, correo: 'ana@correo.com' })).toEqual({})
  })
})

describe('validarLogin', () => {
  it('exige usuario o correo y contraseña', () => {
    expect(Object.keys(validarLogin({ identificador: ' ', contrasena: '' }))).toEqual(['identificador', 'contrasena'])
  })

  it('acepta ambos datos', () => {
    expect(validarLogin({ identificador: 'ana.l', contrasena: 'x' })).toEqual({})
  })
})

describe('validarContrasenaNueva (HU-03b)', () => {
  it('acepta una contraseña que cumple la política y una confirmación igual', () => {
    expect(validarContrasenaNueva('NuevaClave2026', 'NuevaClave2026')).toEqual({})
  })

  it('usa la misma política que el registro: 8 a 128 caracteres con una letra y un número', () => {
    expect(validarContrasenaNueva('corta1', 'corta1').contrasena).toMatch(/de 8 a 128 caracteres/)
    expect(validarContrasenaNueva('solo-letras', 'solo-letras').contrasena).toBeDefined()
    expect(validarContrasenaNueva('12345678', '12345678').contrasena).toBeDefined()
    expect(validarContrasenaNueva(`a1${'x'.repeat(127)}`, `a1${'x'.repeat(127)}`).contrasena).toBeDefined()
    expect(validarContrasenaNueva('Contraseña2026', 'Contraseña2026')).toEqual({})
    expect(mensajeDeContrasena('Treeve2026')).toBeUndefined()
  })

  it('la confirmación tiene que coincidir', () => {
    expect(validarContrasenaNueva('NuevaClave2026', 'NuevaClave2025')).toEqual({ confirmacion: 'Las contraseñas no coinciden.' })
  })

  it('avisa de los dos problemas a la vez', () => {
    expect(Object.keys(validarContrasenaNueva('corta', 'otra'))).toEqual(['contrasena', 'confirmacion'])
  })
})
