# Portal comercial territorial

Nuevo acceso `/commercial` para `COMMERCIAL_REP`, con oportunidades propias, estados/notas, comisiones de la zona, cambio de contraseña y cierre de sesión. La cuenta entra directamente al portal al iniciar sesión. `/start` se resuelve fuera del layout de organizaciones y espera la hidratación, evitando consultas privadas del CRM antes de redirigir.

El formulario solo muestra el departamento y sus municipios autorizados por la API. Confirma autorización de contacto/tratamiento, conserva el comando en reintentos y no envía mensajes. Ganar una oportunidad no activa un plan. Comisiones en consulta; la liquidación corresponde a Finanzas. Sin navegación a plataforma o campañas.

Las restricciones se aplican en el backend por usuario, comercial y territorio; ocultar controles no es la barrera de seguridad. El acceso no implica cobertura de datos electorales o suscripción de organizaciones. El backend requiere `20261026060000_commercial_portal_access` y alta explícita del usuario.

[75 comprobaciones locales con API, PostgreSQL y navegador reales](qa/portal-comercial-local-2026-10-26.json), con interesados y ventas ficticias. Sesión httpOnly y JWT ausente de localStorage, escritorio/móvil sin errores JavaScript o desbordamiento, creación real de oportunidad, redirección desde login y territorios restringidos. También se verificaron TypeScript, lint y compilación Next/Webpack. La API ficticia usada al compilar localmente no se publica; producción se reconstruye con su configuración.

Integrado y desplegado backend `8e1d904` / frontend `1c6ac48`; cuenta solicitada activa en Antioquia con rol comercial y sin organización cliente. Migración `20261026060000_commercial_portal_access` aplicada, 169 migraciones al día. [Recibo productivo](qa/portal-comercial-produccion-2026-10-26.json): login real validado, acceso regional, API y navegador real escritorio/móvil, sin permisos de plataforma ni mensajes externos. Sin contraseñas o JWT en código, documentación o evidencias.
