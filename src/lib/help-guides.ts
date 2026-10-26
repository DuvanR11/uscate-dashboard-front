// Ayuda dentro de Zyron (Fase 5 del plan de formación, 2026-10-26): las guías
// paso a paso de los PDF, dentro del panel. El contenido lo genera
// docs/formacion/_fuentes/guias/generar-ayuda-app.js (no editar los JSON a mano).
// Solo trae las guías para clientes: los JSON terminan en archivos JavaScript
// que se descargan sin sesión, así que las internas de Zyron (operador,
// comerciales, soporte) se quedan en los PDF.
import indice from '@/content/ayuda/indice.json';

export interface GuideSummary {
  n: string;
  slug: string;
  group: string;
  audience: string;
  minutes: number;
  title: string;
  lead: string;
}

export interface GuideStep {
  /** Texto; **así** va en negrita. */
  t: string;
  img?: string;
  phone?: boolean;
  /** Tamaño de la captura en pantalla y franja visible (a–b, de 0 a 1). */
  w?: number;
  h?: number;
  a?: number;
  b?: number;
}

export interface Guide extends GuideSummary {
  need: string;
  steps: GuideStep[];
  result: string;
  fail: string;
}

export const GUIDES_VERSION: string = indice.version;
export const GUIDE_GROUPS: { id: string; name: string }[] = indice.groups;
export const GUIDE_INDEX: GuideSummary[] = indice.guides;

/**
 * Pantallas de cada guía. Deciden quién la ve (la persona tiene que poder abrir
 * alguna, con la misma regla del menú) y dónde la ofrece el botón «?». Sin
 * pantallas, la guía es para todos.
 */
export const GUIDE_SCREENS: Record<string, string[]> = {
  'entrar-y-cambiar-contrasena': [],
  'invitar-al-equipo': ['/users'],
  'personalizar-la-marca': ['/organization/branding'],
  'zonas-y-puestos': ['/catalogs'],
  'registrar-un-contacto': ['/prospects'],
  'importar-contactos': ['/prospects'],
  'enlaces-para-invitar': ['/organization/links'],
  'crear-evento-y-convocar': ['/events', '/calendar'],
  'asistencia-con-qr': ['/dashboard/logistics'],
  'difusion-a-contactos': ['/campaigns/email', '/campaigns/sms'],
  'misiones-y-evidencias': ['/gamification/admin', '/gamification/audit'],
  'leer-el-tablero': ['/dashboard'],
  'instalar-en-el-celular': [],
  'lider-registrar-votante': ['/leader'],
  'lider-enlace-y-confirmar': ['/leader'],
  'voluntario-cumplir-mision': ['/gamification'],
  'recolector-registrar-jornada': ['/signatures'],
  'dia-d-en-vivo': ['/dashboard/dia-d'],
  'radicar-y-responder-solicitudes': ['/requests'],
  'copiloto-de-contenido': ['/campaigns/content-copilot'],
  'resultados-de-una-difusion': ['/campaigns/reports'],
  'radar-legislativo': ['/projects'],
  'derecho-de-peticion': ['/peticiones'],
  'finanzas-de-campana': ['/campaigns/finance'],
  'no-tengo-permiso': ['/users', '/roles'],
  'contacto-no-recibe-mensajes': ['/prospects', '/campaigns/email', '/campaigns/sms'],
  'recuperar-el-acceso': ['/users'],
  'habeas-data': ['/organization/habeas-data'],
  'pedir-ayuda-a-soporte': [],
  'plan-de-gobierno': ['/plan-de-gobierno'],
};

/** Nombre del grupo para quien lee (a un cliente, «Soporte de Zyron» no le dice nada). */
export function groupName(groupId: string, operator: boolean) {
  if (groupId === 'soporte' && !operator) return 'Problemas frecuentes';
  return GUIDE_GROUPS.find((g) => g.id === groupId)?.name ?? groupId;
}

/** Guía de cada paso de «Primeros pasos» del tablero. */
export const ONBOARDING_GUIDES: Record<string, string> = {
  invite_team: 'invitar-al-equipo',
  customize_branding: 'personalizar-la-marca',
  load_territory: 'zonas-y-puestos',
  add_contacts: 'importar-contactos',
  government_plan: 'plan-de-gobierno',
  send_first_campaign: 'difusion-a-contactos',
};

const screenMatches = (pathname: string, screen: string) =>
  pathname === screen || pathname.startsWith(`${screen}/`);

/**
 * Guías de la pantalla abierta, de la más específica: en /dashboard/dia-d sale
 * la del Día D y no la del tablero, aunque /dashboard también coincida.
 */
export function guidesForPath(pathname: string, guides: GuideSummary[]) {
  const scored = guides
    .map((guide) => ({
      guide,
      length: Math.max(
        -1,
        ...(GUIDE_SCREENS[guide.slug] ?? [])
          .filter((screen) => screenMatches(pathname, screen))
          .map((screen) => screen.length),
      ),
    }))
    .filter((entry) => entry.length >= 0);
  const best = Math.max(-1, ...scored.map((entry) => entry.length));
  return scored.filter((entry) => entry.length === best).map((entry) => entry.guide);
}

/** Para buscar sin importar tildes ni mayúsculas. */
export function searchKey(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
