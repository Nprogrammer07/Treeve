/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { describe, expect, it } from 'vitest'

// Una clase de CSS que no existe no rompe la compilación ni las pruebas: la pantalla simplemente se ve sin estilos.
// Esta prueba lee todos los componentes y todos los archivos de estilos y falla si uno usa una clase que no está definida.
// (Vitest se ejecuta con `css: false`, por eso los estilos se leen del disco y no se importan.)
const raiz = join(import.meta.dirname, '..')
const archivos = readdirSync(raiz, { recursive: true, encoding: 'utf8' }).map((ruta) => ruta.replaceAll('\\', '/'))

const sinComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const clasesDefinidas = (css: string) => new Set([...sinComentarios(css).matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1] as string))

interface Uso {
  componente: string
  hoja: string
  usadas: string[]
}

function usosDeEstilos(): Uso[] {
  const usos: Uso[] = []
  for (const ruta of archivos.filter((a) => /\.tsx?$/.test(a) && !a.includes('.test.'))) {
    const codigo = readFileSync(join(raiz, ruta), 'utf8')
    for (const [, nombre, relativa] of codigo.matchAll(/import\s+(\w+)\s+from\s+'(\.[^']+\.module\.css)'/g)) {
      const hoja = posix.join(posix.dirname(ruta), relativa as string)
      const usadas = new Set<string>()
      for (const m of codigo.matchAll(new RegExp(`\\b${nombre}\\.([A-Za-z_]\\w*)`, 'g'))) usadas.add(m[1] as string)
      for (const m of codigo.matchAll(new RegExp(`\\b${nombre}\\['([\\w-]+)'\\]`, 'g'))) usadas.add(m[1] as string)
      usos.push({ componente: ruta, hoja, usadas: [...usadas] })
    }
  }
  return usos
}

describe('estilos (CSS Modules)', () => {
  const usos = usosDeEstilos()

  it('encuentra componentes con estilos: la prueba no pasa en vacío', () => {
    expect(usos.length).toBeGreaterThan(20)
  })

  it('cada componente importa un archivo de estilos que existe', () => {
    const sinArchivo = usos.filter((u) => !archivos.includes(u.hoja)).map((u) => `${u.componente} → ${u.hoja}`)

    expect(sinArchivo).toEqual([])
  })

  it('todas las clases que usa un componente existen en su archivo de estilos', () => {
    const faltantes = usos.flatMap((u) => {
      const definidas = clasesDefinidas(readFileSync(join(raiz, u.hoja), 'utf8'))
      const faltan = u.usadas.filter((clase) => !definidas.has(clase))
      return faltan.length > 0 ? [`${u.componente} usa ${faltan.join(', ')}, que no existen en ${u.hoja}`] : []
    })

    expect(faltantes).toEqual([])
  })
})
