# Cobertura y preparación comercial

Ruta nueva: `/platform/territorial-coverage`, dentro de **Administración → Cobertura comercial**. Pendiente integrar y desplegar junto con la API del backend; sin migración nueva.

Permite buscar conjuntos y territorios, diferenciar disponibilidad municipal, revisión, preparación y archivo; consultar requisitos pendientes, fuentes, publicación y monitoreo. El detalle de organizaciones se consulta al expandir una tarjeta, con diez organizaciones por página y sus estados de acceso calculados por el evaluador existente. El listado principal muestra veinte conjuntos por página; los indicadores y el CSV corresponden solo a esa página.

Requiere permisos internos habilitados, alcance global y capacidades `CATALOG_MANAGE`, `ORGANIZATIONS_READ` y `BILLING_READ`. La API impone las mismas condiciones. No hay activación automática de territorios, pagos, demos ni cron. Las respuestas se validan antes de mostrar disponibilidad y una respuesta incompatible deja el panel en error, con opción de reintentar.

El CSV es una descarga local, con comillas escapadas y prefijos de fórmulas neutralizados. Incluye fecha de cálculo y limitaciones, sin comprobantes ni datos financieros de organizaciones. No genera enlaces públicos ni persistencia nueva.

Verificado con TypeScript, ESLint, compilación completa Next.js, 26 comprobaciones de formato/CSV y nueve escenarios de navegador con API interceptada. Escritorio y móvil sin desplazamiento horizontal; descarga CSV real en ambos. Dos recorridos adicionales verificaron las vistas y la descarga con el frontend compilado, usando API local ficticia. Backend verificado por separado mediante HTTP autenticado y PostgreSQL desechable. Las capturas y los escenarios usan datos ficticios; no acreditan cobertura electoral real de Medellín.

[Evidencia del navegador](qa/cobertura-comercial-navegador-2026-10-17.json), [verificación del compilado](qa/cobertura-comercial-compilado-2026-10-17.json), [vista de escritorio](qa/cobertura-comercial-escritorio.png) y [vista móvil](qa/cobertura-comercial-movil.png).

Pruebas: `node scripts/check-commercial-coverage.cjs`. Para navegador, servidor local en 3057, `COVERAGE_BROWSER_TEST=true`, `COVERAGE_BROWSER_BACKEND` apuntando al backend y `COVERAGE_BROWSER_OUTPUT` a la carpeta local de resultados. Sin fuentes externas ni producción.
