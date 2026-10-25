# Alcance municipal con datos verificables

Integrado en main y desplegado el 25/10/2026 a las 17:53:31 de Colombia, desde el commit `e34ca97a81a5d1bc0a837fc1a63746a44c91964d`. Sin cambios de API ni migración.

Administración → Cobertura comercial incorpora «Cobertura de esta entrega» en cada ficha. El texto depende del estado ya validado por la API: municipal disponible, sin datos verificados para ofrecer o archivado. Para el estado municipal se aclaran informes, fuentes/metodología y necesidad de acceso autorizado. Se identifican como fuera de esta entrega el detalle por comuna/corregimiento/puesto, demografía y participación por edad, sin aprobar pendientes geográficos.

El informe CSV añade tres columnas al final, conservando las anteriores: alcance verificable, detalle submunicipal y demografía/participación por edad. Utiliza la misma descripción de alcance que la ficha y mantiene neutralización de fórmulas y delimitación de la página consultada.

El criterio aprobado y la matriz de fases se documentan en el backend, `docs/analitica-territorial/cierre-municipal-datos-publicos.md`. No se cambian disponibilidad de datos, permisos, contratos, publicaciones ni controles de conciliación. Los territorios sin datos publicados conservan su estado de preparación.

Verificación: TypeScript, ESLint de los archivos afectados y 26 controles de respuestas/CSV correctos. Nueve escenarios Chrome con API interceptada, incluidas descargas de escritorio/móvil, textos distintos para Neiva disponible y Medellín pendiente, búsqueda, paginación, errores y permisos. Sin escrituras, errores JavaScript o desbordamiento horizontal. [Evidencia](qa/alcance-municipal-2026-10-25.json). La fixture CORS se actualizó para admitir credenciales; no se cambió la autenticación del producto. Navegador sobre servidor local de desarrollo; no se ejecutó una compilación de producción para este cambio de presentación ni se desplegó el paquete local con API ficticia.

## Verificación productiva

Pasaron **44 comprobaciones reales**. [Evidencia sanitizada](qa/alcance-municipal-despliegue-2026-10-25.json). Chrome consultó la API real a 1440 y 390 px, comprobó el alcance municipal de Neiva y la preparación de Medellín, abrió el panel de accesos y descargó el CSV en ambos tamaños. Los archivos tienen 16 columnas, conservan el ámbito de página y distinguen el alcance de cada conjunto y sus exclusiones. Se analizaron los CSV completos en memoria; los archivos temporales se eliminaron sin exportar datos de organizaciones.

No hubo errores JavaScript, desbordamiento horizontal o escrituras desde el navegador. Anónimos, organización demo y suplantación conservaron sus denegaciones de acceso al panel administrativo. Las 56 operaciones geográficas y 46 referencias (23 actuales y 23 históricas) permanecen intactas; cero revisiones aceptadas y validación geográfica sin cerrar.

Imagen frontend: `sha256:c452675b7971ab6dce71ac4c0b7360a25ed48a2ab1b1f682345e362e12c0a67b`. Se reconstruyó en el servidor con la configuración productiva desde un archivo Git verificado; no se usó el bundle local de API ficticia. El contenedor, imagen y marcador del backend se conservaron, junto con las 165 migraciones aplicadas, configuración y fuentes/publicaciones. Se respaldaron el override y la imagen anterior del frontend para reversión; no se necesitó revertir ni migrar la base. Entrega: `/opt/uscategui/releases/zyron-20261025-municipal-e34ca97`.

La documentación de cierre se registra en un commit posterior al código de la imagen desplegada. La entrega municipal no habilita nuevas regiones, mapas submunicipales, demografía, cron, contratos o accesos.
