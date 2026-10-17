# N6.3 — Control del ejecutor regional

Implementado el 17 de octubre de 2026 sobre N6.2. **Integrado y desplegado a las 16:29:51 de Colombia**, frontend `a26f022` y backend `8d36e76`. Se aplicaron `20261017210000_territorial_monitoring_plans` y `20261017230000_territorial_regional_monitor`. El proceso regional permanece apagado.

**Administración → Monitoreo por región** presenta, para cada conjunto regional, su política de fuentes y un control independiente de ejecución. El control muestra interruptor global, activación, revisión aprobada, próxima ejecución, requisitos, alertas y trabajos anteriores. No crea ni modifica controles al consultar. Neiva reutiliza su programación anterior.

La activación exige política preparada vigente, proceso global habilitado, confirmación explícita del operador y motivo. Se puede desactivar un control existente con el interruptor global apagado. Cambiar la política obliga a revisarla y confirmar nuevamente el control; no adopta fuentes automáticamente.

Ante una confirmación incierta o una lectura posterior fallida, el frontend conserva el comando y su clave idempotente. Un estado sin actualizar bloquea nuevos cambios hasta recuperar la lectura o la confirmación pendiente. Las respuestas se verifican contra el conjunto solicitado.

El panel muestra veinte ejecuciones y cambios, hasta cincuenta alertas, sus episodios y responsable. Los avisos son internos y no envían correos. La observación de una fuente inaccesible no acredita que su contenido siga igual. No se publican cifras ni se sustituyen originales desde esta vista.

Verificado: TypeScript, ESLint, compilación Next.js de 94 rutas, veinte comprobaciones de respuestas y catorce recorridos de navegador de escritorio/móvil. API interceptada y datos sintéticos, sin activación real ni consultas de producción. Detalle y evidencia: `api-uscate-back/docs/analitica-territorial/nacionalizacion/n63-ejecutor-regional.md`.

El despliegue añadió 74 comprobaciones reales de API y Chrome autenticado: panel apagado, botón de activación deshabilitado, programación anterior de Neiva visible y cero errores JavaScript. La primera verificación encontró dos selectores con acentos dañados en el script y provocó una reversión automática; corregido el verificador, se activaron y comprobaron las mismas imágenes. Acta y evidencia: `api-uscate-back/docs/analitica-territorial/nacionalizacion/despliegue-n62-n63-2026-10-17.md`.
