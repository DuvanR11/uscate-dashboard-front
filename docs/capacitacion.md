# Capacitación

Implementación del 4 de noviembre de 2026. **Validada localmente; no publicada**. Integrar con la entrega del servidor de capacitación.

- Clientes y operador: `/capacitacion`, desde el menú, Ayuda y Primeros pasos.
- Comerciales: `/commercial/capacitacion`, desde su portal independiente.
- Catálogo según acceso, búsqueda, filtros por avance, lecciones, evaluación, práctica y constancia PDF.
- Seguimiento paginado y validación de prácticas para las cuentas autorizadas.
- Los datos y el contenido provienen de `/training`. El avance se conserva en la API por persona y organización, sin persistencia de capacitación en `localStorage`.
- Las claves de evaluación y el contenido comercial interno no se incluyen en archivos estáticos del panel.

El PDF se genera con la dependencia existente `jspdf`, después de obtener la constancia privada desde la API. No agrega dependencias. Los cursos usan texto y guías; los videos finales siguen pendientes de aprobación editorial.

Vista previa aislada: `node scripts/validate-training-workspace.cjs`, con API de prueba en `http://127.0.0.1:3199`. La caché `.next-training-validation` queda ignorada por Git. El servidor y las pruebas de navegador se encuentran en el repositorio de la API, `scripts/db-tests/*training*`.
