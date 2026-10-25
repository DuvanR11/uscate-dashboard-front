# T4: revisión 4 de evidencias geográficas

Implementada y verificada localmente el 25 de octubre de 2026. **Desplegada junto con el backend el 25/10/2026 a las 17:24:04 de Colombia; sin migración.** La pantalla sigue en Administración → Fuentes territoriales → Validación geográfica de T4.

El cliente acepta la nueva revisión 4, conserva las revisiones 2/3 y el informe antiguo y rechaza revisiones desconocidas o huellas alteradas. La nueva evidencia agrega dos originales JSON públicos atribuidos a Registraduría y su contraste reproducible con los 52 puestos del PDF: coincidencia de nombres, direcciones, coordenadas decimales y unidades. El informe tiene catorce fuentes y nueve hallazgos; todos los casos y requisitos siguen pendientes. El texto explica que la coincidencia no acredita el CRS ni la vigencia histórica de los límites.

No se agregan botones de aprobación ni se reasignan puestos. El backend mantiene el catálogo V2 y sus coordenadas no aprobadas; la fuente puede compartir insumo con el PDF. La actualización de datos de octubre de 2023, la modificación de metadatos en mayo de 2026 y la adquisición de octubre de 2026 se explican por separado. Las banderas de elecciones ofertadas no son votos o participación.

Pasaron TypeScript, lint de los dos archivos de producto, compilación de producción con Webpack y **quince escenarios Chrome con API interceptada**: escritorio/móvil, permisos/alcance, errores, reintentos, corrupción y compatibilidad de versiones. Se descargó el JSON real en escritorio y móvil y se comparó completo con el informe de backend; sin escrituras, errores JavaScript o desbordamiento horizontal. [Evidencia](qa/t4-datos-abiertos-2026-10-25.json).

El navegador se ejecutó sobre el servidor local de desarrollo. La compilación de producción pasó por separado; usa API local ficticia y no debe distribuirse como paquete de producción. Al desplegar hay que reconstruir con la URL real. Los avisos existentes de Next sobre middleware/Edge no impidieron compilar.

La fixture de error se estabilizó frente al doble montaje de React; se actualizaron CORS con credenciales y la marca ficticia del entorno de prueba. No se cambió el comportamiento de recuperación del producto. El runner ahora permite seleccionar backend y directorio de salida mediante variables, añade el caso de revisión 3 y rechaza revisión 99.

Reproducción: levantar Next local con `NEXT_PUBLIC_API_URL` ficticia, configurar `TERRITORIAL_TEST_BACKEND`, `TERRITORIAL_TEST_ORIGIN` y `TERRITORIAL_TEST_OUTPUT` y ejecutar `node scripts/check-territorial-crosswalk.cjs`. El backend debe contener el informe `neiva-validacion-datos-abiertos-2026-10-25.json`.

La nueva huella documental vuelve antiguas las referencias que el flujo persistente haya vinculado a la huella anterior; su historial se conserva. Las decisiones humanas y cualquier publicación geográfica continúan en sus controles existentes. Esta entrega no cambia el estado productivo del flujo ni envía solicitudes a entidades externas.

Verificación productiva: 43 comprobaciones, API real, catorce fuentes y nueve hallazgos visibles; descarga JSON real idéntica a la API en escritorio/móvil (30.187 bytes). Ambos servicios saludables, historial geográfico conservado y 165 migraciones aplicadas. [Evidencia del despliegue](qa/t4-despliegue-2026-10-25.json). Los cuatro casos y seis requisitos permanecen pendientes; no se aprobaron correspondencias ni se enviaron mensajes externos.
