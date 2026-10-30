# Recursos de terceros

El stack exige que todo recurso de terceros tenga licencia libre registrada en el repositorio (guía del frontend, sección 6).

| Recurso | Ubicación | Uso | Licencia |
|---|---|---|---|
| Fraunces (variable, subconjunto latino) | `src/Presentation/Treeve.Web/src/app/fuentes/fraunces-latin-wght-normal.woff2` | Títulos | SIL Open Font License 1.1 |
| Caveat (variable, subconjunto latino) | `src/Presentation/Treeve.Web/src/app/fuentes/caveat-latin-wght-normal.woff2` | Mensaje de apoyo (manuscrita) | SIL Open Font License 1.1 |
| Nunito (variable, subconjunto latino) | `src/Presentation/Treeve.Web/src/app/fuentes/nunito-latin-wght-normal.woff2` | Texto de la interfaz | SIL Open Font License 1.1 |

Las fuentes se obtuvieron de los paquetes `@fontsource-variable/fraunces`, `@fontsource-variable/nunito` y `@fontsource-variable/caveat` y se copiaron al repositorio, sin agregar esas librerías como dependencia.
Texto de la licencia: https://openfontlicense.org/open-font-license-official-text/

Son dibujos propios del proyecto: los íconos (`shared/ui/Icono.tsx`), los rostros de emociones y la escena 2.5D.
Los sonidos de fondo se sintetizan con Web Audio, así que no hay archivos de audio de terceros.
