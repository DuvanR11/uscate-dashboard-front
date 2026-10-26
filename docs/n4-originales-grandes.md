# N4: originales regionales grandes

Implementado y verificado localmente el 25/10/2026. Pendiente integrar, desplegar backend/frontend, verificar scanner/proxy y activar la ampliación. Esta entrega no crea migraciones ni carga datos en producción.

La capacidad se consulta en `uploadLimits` de la API, con validación estricta: PDF 10 MiB y ZIP 10 o 32 MiB según la habilitación. Un backend anterior sin ese campo conserva 10 MiB. Límites inesperados o incoherentes se rechazan; el cliente no confía en un número arbitrario para ampliar la carga.

El formulario informa la capacidad vigente y valida antes de calcular el SHA-256 o reservar; completar un original pendiente también valida el límite. Se conserva el mismo comando/archivo ante una respuesta incierta. Las nuevas reservas usan `OTHER` por defecto, rotulado «Otro tipo / sin acreditar»; no se deduce escrutinio del formato o tamaño. La revisión documental y publicación conservan sus controles.

Pasaron TypeScript, lint y compilación Next/Webpack, 15 comprobaciones del contrato y 18 escenarios Chrome con API interceptada: original ficticio de 29.370.830 bytes en escritorio/móvil, capacidad deshabilitada, exceso, límite manipulado, compatibilidad antigua, reintentos, recuperación, lectura y cambio de contexto. Sin errores JavaScript ni desbordamiento. [Evidencia](qa/n4-originales-grandes-2026-10-25.json). Las secciones ajenas al ensayo pueden emitir avisos de marca de la fixture; no se presentan como errores del producto. El navegador usa desarrollo local; la compilación pasó por separado y su API ficticia no se distribuye en producción.

El backend pasó 92 pruebas y el ZIP real de Antioquia pasó preflight/CRC y ClamAV aislado. La firma inocua situada al final del CSV grande fue detectada sin almacenar; base y almacenamiento se simularon. No se acredita todavía una descarga privada real de Spaces. El runbook está en el backend: `docs/analitica-territorial/nacionalizacion/n4-originales-grandes.md`.
