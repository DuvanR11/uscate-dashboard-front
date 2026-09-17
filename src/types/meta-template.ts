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
}
