# Operación territorial — N6.1

Integrado en `main` y desplegado el 17 de octubre de 2026 desde `c4b6879`, junto con N5.1/N5.2. Backend final `c38efd2`: 35 comprobaciones de producción, incluidos panel, consulta real de Neiva e historial privado. N6 no añade migración propia; se aplicó la dependencia documental pendiente `20261017120000_territorial_documentary_cases` tras respaldo restaurado y ensayo.

Administración → Operación territorial muestra hasta 20 conjuntos por página: elección, corporación, territorio, fuentes, preparación documental, cambios en sus antecedentes, publicaciones, ejercicios sintéticos y advertencias internas. También presenta la cola global de informes y el monitoreo remoto de Neiva. No habilita comprobaciones remotas de otros conjuntos.

Solo se consulta con gestión del catálogo, controles internos habilitados y alcance global. La API revalida esa autorización incluso cuando reutiliza un agregado de 15 segundos. La pantalla es de lectura y permite actualizar, navegar páginas y reintentar errores. Una respuesta fallida/inválida no conserva las tarjetas anteriores como datos vigentes.

Verificación: TypeScript, ESLint, build Next de 93 rutas, 21 comprobaciones del contrato y 10 escenarios en navegador con API simulada, incluidos escritorio/móvil, permisos y paginación. Sin escrituras, errores de JavaScript ni solicitudes a producción. Scripts: `scripts/check-territorial-operations.cjs` y `scripts/fixtures/territorial-operations.cjs`.

La documentación y evidencias de carga/recuperación están en el backend: `docs/analitica-territorial/nacionalizacion/n6-operacion-multirregional.md`. Los ensayos usan datos ficticios; no acreditan capacidad HTTP nacional ni cierran N4/T4.
