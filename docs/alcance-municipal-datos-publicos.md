# Alcance municipal con datos verificables

Implementado el 25 de octubre de 2026; pendiente integrar y desplegar el frontend. Sin cambios de API ni migración.

Administración → Cobertura comercial incorpora «Cobertura de esta entrega» en cada ficha. El texto depende del estado ya validado por la API: municipal disponible, sin datos verificados para ofrecer o archivado. Para el estado municipal se aclaran informes, fuentes/metodología y necesidad de acceso autorizado. Se identifican como fuera de esta entrega el detalle por comuna/corregimiento/puesto, demografía y participación por edad, sin aprobar pendientes geográficos.

El informe CSV añade tres columnas al final, conservando las anteriores: alcance verificable, detalle submunicipal y demografía/participación por edad. Utiliza la misma descripción de alcance que la ficha y mantiene neutralización de fórmulas y delimitación de la página consultada.

El criterio aprobado y la matriz de fases se documentan en el backend, `docs/analitica-territorial/cierre-municipal-datos-publicos.md`. No se cambian disponibilidad de datos, permisos, contratos, publicaciones ni controles de conciliación. Los territorios sin datos publicados conservan su estado de preparación.

Verificación: TypeScript, ESLint de los archivos afectados y 26 controles de respuestas/CSV correctos. Nueve escenarios Chrome con API interceptada, incluidas descargas de escritorio/móvil, textos distintos para Neiva disponible y Medellín pendiente, búsqueda, paginación, errores y permisos. Sin escrituras, errores JavaScript o desbordamiento horizontal. [Evidencia](qa/alcance-municipal-2026-10-25.json). La fixture CORS se actualizó para admitir credenciales; no se cambió la autenticación del producto. Navegador sobre servidor local de desarrollo; no se ejecutó una compilación de producción para este cambio de presentación ni se desplegó el paquete local con API ficticia.
