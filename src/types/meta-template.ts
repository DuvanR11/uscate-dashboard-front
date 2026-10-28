// Deuda técnica menor (2026-09-17) — forma real de
// `GET /campaigns/meta/templates` (Graph API de Meta, proxificada por el
// backend), verificada contra el uso real en `whatsapp-meta/page.tsx` y
// `BroadcastModal.tsx`.
export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  // Fase 2 del análisis de punta a punta (2026-10-28, MSG-07): Meta también
  // devuelve las partes de la plantilla; con ellas la ventana de difusión
  // sabe si lleva imagen y qué variables hay que llenar con el archivo.
  parameter_format?: string;
  components?: MetaTemplateComponent[];
}

export interface MetaTemplateComponent {
  type: string;
  format?: string;
  text?: string;
}
