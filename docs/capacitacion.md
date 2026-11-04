# Capacitación

Implementación del 4 de noviembre de 2026. Publicación y videos autorizados por el usuario; consultar el registro de producción para el estado de activación. Integra la entrega 3c que ya corre en producción.

- Clientes y operador: `/capacitacion`, desde el menú, Ayuda y Primeros pasos.
- Comerciales: `/commercial/capacitacion`, desde su portal independiente.
- Catálogo según acceso, búsqueda, filtros por avance, lecciones, evaluación, práctica y constancia PDF.
- Seguimiento paginado y validación de prácticas para las cuentas autorizadas.
- Los datos y el contenido provienen de `/training`. El avance se conserva en la API por persona y organización, sin persistencia de capacitación en `localStorage`.
- Las claves de evaluación y el contenido comercial interno no se incluyen en archivos estáticos del panel.

El PDF se genera con la dependencia existente `jspdf`, después de obtener la constancia privada desde la API. No agrega dependencias. Cada curso incluye video con voz sintética colombiana, portada y subtítulos; se reproduce desde la API con cookie de sesión y `crossOrigin="use-credentials"`. Los archivos comerciales nunca se incluyen en los recursos públicos del panel.

Vista previa aislada: `node scripts/validate-training-workspace.cjs`, con API de prueba en `http://127.0.0.1:3199`. La caché `.next-training-validation` queda ignorada por Git. El servidor y las pruebas de navegador se encuentran en el repositorio de la API, `scripts/db-tests/*training*`.
