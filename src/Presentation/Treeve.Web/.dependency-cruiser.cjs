/**
 * Reglas de dependencias del frontend, verificadas en CI con `npm run depcruise`.
 * Mismo espíritu que las pruebas de arquitectura del backend: si se rompe una regla, el build falla.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'sin-ciclos',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'features-aisladas',
      comment:
        'Una feature (src/features/<modulo>) no importa otra feature. Lo compartido vive en src/shared; la composición en src/app.',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'shared-no-conoce-features',
      comment: 'src/shared es la base: no depende de features, de la escena ni de la app.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|scene|app)/' },
    },
    {
      name: 'pixi-solo-en-scene',
      comment:
        'PixiJS queda encapsulado en src/scene (ADR-003). El resto de la app usa la escena a través de su API pública.',
      severity: 'error',
      from: { pathNot: '^src/scene/' },
      to: { path: 'node_modules/(pixi\\.js|@pixi)/' },
    },
    {
      name: 'sin-acceso-directo-a-la-base',
      comment:
        'Solo el backend accede a la base de datos (ADR-002, punto 1). El frontend habla únicamente con la API.',
      severity: 'error',
      from: {},
      to: { path: 'node_modules/(@supabase|pg|postgres)/' },
    },
    {
      name: 'sin-imports-sin-resolver',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
}
