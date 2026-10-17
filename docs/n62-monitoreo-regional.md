# N6.2 — Monitoreo por región

Implementado el 17 de octubre de 2026. **Desplegado junto a N6.3 y verificado a las 16:29:51 de Colombia**, frontend `a26f022` y backend `8d36e76`, con `20261017210000_territorial_monitoring_plans` y la migración N6.3 aplicadas. El ejecutor regional permanece apagado; Neiva conserva su programación anterior.

**Administración → Monitoreo por región** permite elegir un conjunto, seleccionar originales y responsable, proponer horario diario/semanal de Colombia, fecha de revisión y preferencias de alertas. Se guarda como borrador o configuración preparada, con requisitos e historial. Las nuevas regiones permanecen desactivadas: guardar no inicia consultas ni envía avisos. El ejecutor N6.3 ya está desplegado y apagado; su control requiere aprobación independiente por región.

Neiva presenta sus fuentes fijadas y reutiliza su programación existente; no crea un segundo trabajo ni modifica el horario al consultar. Los accesos desde Operación territorial conservan el conjunto seleccionado.

Se exige acceso interno global de catálogo. El frontend bloquea edición al perder una lectura vigente y conserva exactamente las solicitudes cuyo guardado no pudo confirmar, incluso si falló la consulta posterior a la aceptación.

Validación: TypeScript, ESLint, compilación Next.js de 94 rutas, 25 verificaciones de respuestas y 16 recorridos Chrome de escritorio/móvil contra la compilación local, con API interceptada y datos sintéticos. Incluye permisos, guardado, preparación, semanal, conflictos, reintentos sin duplicación, Neiva y cambio de contexto. No acredita comportamiento HTTP real de producción.

Evidencia y alcance detallados: `api-uscate-back/docs/analitica-territorial/nacionalizacion/n62-monitoreo-regional.md` y sus dos archivos JSON en `fuentes/`.
