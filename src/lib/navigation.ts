import {
  LayoutDashboard,
  Users,
  Map,
  CalendarDays,
  FileText,
  Settings,
  ShieldAlert,
  Briefcase,
  Megaphone,
  Mail,
  MessageSquare,
  Database,
  Target,
  BarChart3,
  Scale,
  Landmark,
  Award,
  FolderOpen,
  Building2,
  Fingerprint,
  Radio,
  Radar,
  Workflow,
  Flag,
  ShieldCheck,
  Wallet,
  Sparkles,
  PenLine,
  UsersRound,
  UserCircle,
  Share2,
  BookOpenCheck,
  Smartphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Fase 2 "Menú y nombres" (2026-10-06): el menú pasó de 49 enlaces en 8
// grupos con nombres internos ("Buhos", "Contabilidad", "Predictivas IA",
// "Fichas Digitales") a unos 29 enlaces agrupados por tarea. Ninguna pantalla
// se eliminó: las que antes tenían enlace propio ahora son PESTAÑAS de una
// sección (`tabs`). Este archivo es la única definición; lo leen la barra
// lateral (`sidebar.tsx`) y la barra de pestañas (`section-tabs.tsx`).

export interface NavAccess {
  /** `canRead` exactamente en este módulo. */
  requiredModule?: string;
  /** `canRead` en CUALQUIERA de estos módulos. */
  requiredModules?: string[];
  /** `canRead` en TODOS estos módulos (Sala de Guerra: el backend exige los tres). */
  requiredAllModules?: string[];
  /** Este módulo o cualquiera de sus hijos reales del catálogo de permisos. */
  requiredModuleOrChildren?: string;
  /**
   * Además del permiso, solo para estos roles. Es para enlaces PERSONALES
   * ("Mi panel" del líder), que no tienen sentido para quien administra.
   */
  roles?: string[];
}

export interface NavTab extends NavAccess {
  label: string;
  href: string;
  /** Otras rutas que también pertenecen a esta pestaña (p. ej. un detalle). */
  matchPrefixes?: string[];
}

export interface NavItem extends NavAccess {
  label: string;
  icon: LucideIcon;
  /** Enlace directo. Si la sección tiene `tabs`, se usa la primera visible. */
  href?: string;
  /** Pantallas de esta sección, mostradas como pestañas dentro de la página. */
  tabs?: NavTab[];
  matchPrefixes?: string[];
}

/** Un grupo se muestra cuando al menos uno de sus ítems es visible. */
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const isGroup = (entry: NavEntry): entry is NavGroup =>
  'children' in entry;

/**
 * Los módulos de Solicitudes son hermanos sin padre común en el catálogo. Cada
 * TIPO tiene el suyo; `SOLICITUDES_GLOBAL` no está aquí porque no da acceso a
 * ningún tipo: solo amplía la vista a las solicitudes de todo el equipo.
 */
const SOLICITUDES_MODULES = [
  'SOLICITUDES_INTERNAS',
  'SOLICITUDES_LEGISLATIVAS',
  'SOLICITUDES_SEGURIDAD',
];

export const NAVIGATION: NavEntry[] = [
  // Fase 4 "Líderes y celular" (2026-10-06): el panel del líder no tenía
  // enlace en el menú (solo se llegaba desde un botón en Prospectos).
  { label: 'Mi panel', icon: Smartphone, href: '/leader', requiredModule: 'PROSPECTOS', roles: ['LEADER'] },
  { label: 'Inicio', icon: LayoutDashboard, href: '/dashboard', requiredModule: 'DASHBOARD' },
  { label: 'Prospectos', icon: Users, href: '/prospects', requiredModule: 'PROSPECTOS' },
  {
    label: 'Territorio',
    icon: Map,
    children: [
      {
        label: 'Agenda y eventos',
        icon: CalendarDays,
        requiredModule: 'AGENDA',
        matchPrefixes: ['/events'],
        tabs: [
          { label: 'Calendario', href: '/calendar', requiredModule: 'AGENDA' },
          { label: 'Eventos', href: '/events', requiredModule: 'AGENDA' },
          // Generador de enlaces y QR de registro de asistencia por evento.
          { label: 'Registro de asistencia', href: '/dashboard/logistics', requiredModule: 'AGENDA' },
        ],
      },
      { label: 'Mapa', icon: Map, href: '/map', requiredModule: 'MAPA' },
      // Antes "Contabilidad": es la recolección de firmas y su liquidación.
      { label: 'Firmas', icon: PenLine, href: '/signatures', requiredModule: 'CONTABILIDAD' },
    ],
  },
  {
    label: 'Equipo',
    icon: UsersRound,
    children: [
      {
        label: 'Líderes',
        icon: Award,
        requiredModuleOrChildren: 'PRODUCTIVIDAD_GLOBAL',
        matchPrefixes: ['/users/productivity'],
        tabs: [
          { label: 'Ranking', href: '/users/productivity/ranking', requiredModule: 'PRODUCTIVIDAD_RANKING' },
          { label: 'Reportes', href: '/users/productivity/reports', requiredModule: 'PRODUCTIVIDAD_REPORTES' },
          // Fase 4: qué acciones dan puntos y cuántos (el líder la ve en solo lectura).
          { label: 'Reglas de puntos', href: '/users/productivity/rules', requiredModule: 'PRODUCTIVIDAD_RANKING' },
        ],
      },
      {
        // Antes "Buhos" (nombre interno del programa de voluntarios de redes).
        label: 'Voluntarios',
        icon: Target,
        requiredModule: 'GAMIFICACION',
        tabs: [
          { label: 'Resumen', href: '/gamification/dashboard', requiredModule: 'GAMIFICACION' },
          { label: 'Misiones', href: '/gamification', requiredModule: 'MISIONES' },
          { label: 'Evidencias por revisar', href: '/gamification/audit', requiredModule: 'GAMIFICACION_AUDITORIA' },
          { label: 'Administrar misiones', href: '/gamification/admin', requiredModule: 'GAMIFICACION_ADMIN' },
          { label: 'Historial', href: '/gamification/historico', requiredModule: 'GAMIFICACION' },
          { label: 'Referidos', href: '/gamification/referrals', requiredModule: 'GAMIFICACION' },
          { label: 'Ayuda', href: '/gamification/questions', requiredModule: 'GAMIFICACION' },
        ],
      },
    ],
  },
  {
    label: 'Difusiones',
    icon: Megaphone,
    // Sin WhatsApp (Fase 0): el canal oficial prohíbe el uso político y el
    // bot no oficial viene apagado. Sus pantallas siguen en
    // /campaigns/whatsapp y /campaigns/whatsapp-meta.
    children: [
      { label: 'Correo', icon: Mail, href: '/campaigns/email', requiredModule: 'DIFUSIONES' },
      { label: 'SMS', icon: MessageSquare, href: '/campaigns/sms', requiredModule: 'DIFUSIONES' },
      { label: 'Resultados', icon: BarChart3, href: '/campaigns/reports', requiredModule: 'DIFUSIONES' },
      { label: 'Copiloto de contenido', icon: Sparkles, href: '/campaigns/content-copilot', requiredModule: 'COPILOTO_CONTENIDO' },
      { label: 'Automatización', icon: Workflow, href: '/campaigns/automation', requiredModule: 'AUTOMATIZACION_CAMPANA' },
    ],
  },
  { label: 'Día D en vivo', icon: Flag, href: '/dashboard/dia-d', requiredModule: 'DASHBOARD' },
  {
    label: 'Cumplimiento',
    icon: ShieldCheck,
    children: [
      { label: 'Finanzas de campaña', icon: Wallet, href: '/campaigns/finance', requiredModule: 'FINANZAS_CAMPANA' },
      { label: 'Habeas Data', icon: BookOpenCheck, href: '/organization/habeas-data', requiredModule: 'HABEAS_DATA' },
    ],
  },
  {
    // Antes "Campaña - Oficina".
    label: 'Despacho',
    icon: Landmark,
    children: [
      // Antes "Fichas Digitales".
      { label: 'Radar Legislativo', icon: Radar, href: '/projects', requiredModule: 'PROYECTOS_LEY' },
      {
        label: 'Derechos de petición',
        icon: Scale,
        requiredModules: ['PETICIONES', 'ENTRENAR_IA'],
        tabs: [
          { label: 'Peticiones', href: '/peticiones', requiredModule: 'PETICIONES' },
          { label: 'Entrenar la IA', href: '/peticiones/memoria', requiredModule: 'ENTRENAR_IA' },
        ],
      },
      {
        // Fase 5 (2026-10-07): antes dos enlaces para dos bandejas casi
        // iguales. Lo que radica un ciudadano y lo que registra el equipo se
        // atiende desde un solo lugar.
        label: 'Solicitudes y denuncias',
        icon: FileText,
        requiredModules: [...SOLICITUDES_MODULES, 'DENUNCIAS_DEMANDAS'],
        tabs: [
          { label: 'Solicitudes', href: '/requests', requiredModules: SOLICITUDES_MODULES },
          { label: 'Denuncias', href: '/denuncias', requiredModule: 'DENUNCIAS_DEMANDAS' },
        ],
      },
      { label: 'Documentos', icon: FolderOpen, href: '/documentos', requiredModule: 'GESTION_DOCUMENTAL' },
    ],
  },
  {
    // Antes "Predictivas IA", "Sala de Guerra" e "Investigación OSINT" por separado.
    label: 'Inteligencia',
    icon: Radio,
    children: [
      {
        label: 'Sala de Guerra',
        icon: Radio,
        href: '/sala-de-guerra',
        requiredAllModules: ['DASHBOARD', 'MONITOREO_PREDICTIVO', 'OSINT_CASOS'],
      },
      {
        label: 'Monitoreo de medios',
        icon: Radar,
        requiredModule: 'MONITOREO_PREDICTIVO',
        tabs: [
          { label: 'Menciones', href: '/inteligencia/monitoreo', requiredModule: 'MONITOREO_PREDICTIVO' },
          { label: 'Mapa', href: '/inteligencia', requiredModule: 'MONITOREO_PREDICTIVO' },
          { label: 'Estadísticas', href: '/inteligencia/estadisticas', requiredModule: 'MONITOREO_PREDICTIVO' },
          { label: 'Vínculos', href: '/inteligencia/redes', requiredModule: 'MONITOREO_PREDICTIVO' },
          { label: 'Cargar noticias', href: '/inteligencia/ingesta', requiredModule: 'MONITOREO_PREDICTIVO' },
          { label: 'Redactor de discursos', href: '/inteligencia/plenarias', requiredModule: 'MONITOREO_PREDICTIVO' },
        ],
      },
      { label: 'Redes sociales', icon: Share2, href: '/estadisticas-redes', requiredModule: 'ESTADISTICAS_REDES' },
      {
        label: 'Investigación',
        icon: Fingerprint,
        requiredModules: ['OSINT_CASOS', 'OSINT_ENTITY_RESOLUTION'],
        tabs: [
          { label: 'Casos', href: '/osint/casos', requiredModule: 'OSINT_CASOS' },
          { label: 'Entidades', href: '/osint/entidades', requiredModule: 'OSINT_ENTITY_RESOLUTION' },
          // Solo lectura: el catálogo global se edita en "Plataforma".
          { label: 'Fuentes', href: '/osint/fuentes', requiredModule: 'OSINT_CASOS' },
          { label: 'Auditoría', href: '/osint/auditoria', requiredModule: 'OSINT_CASOS' },
        ],
      },
    ],
  },
  {
    // Antes "Administración".
    label: 'Configuración',
    icon: Settings,
    children: [
      {
        label: 'Usuarios y permisos',
        icon: ShieldAlert,
        requiredModules: ['USUARIOS', 'CONFIGURACION'],
        tabs: [
          { label: 'Usuarios', href: '/users', requiredModule: 'USUARIOS' },
          // El backend protege `/roles` con CONFIGURACION (RolesController).
          { label: 'Roles y plantillas', href: '/roles', requiredModule: 'CONFIGURACION' },
        ],
      },
      {
        label: 'Organización',
        icon: Briefcase,
        requiredModule: 'CONFIGURACION',
        tabs: [
          // Sin permiso propio: el backend solo exige una organización en la sesión.
          { label: 'Enlaces públicos', href: '/organization/links' },
          { label: 'Marca', href: '/organization/branding', requiredModule: 'PERSONALIZACION' },
          { label: 'Plan', href: '/organization/plan', requiredModule: 'PLAN' },
        ],
      },
      { label: 'Catálogos', icon: Database, href: '/catalogs', requiredModule: 'CATALOGOS' },
      { label: 'Mi perfil', icon: UserCircle, href: '/profile' },
    ],
  },
  // Cruzado de organización: solo el operador de la plataforma.
  { label: 'Plataforma', icon: Building2, href: '/platform', requiredModule: 'PLATAFORMA' },
];

// ---- Coincidencia de rutas ------------------------------------------

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Rutas que "pertenecen" a un ítem: su enlace, sus pestañas y sus prefijos extra. */
export function itemPrefixes(item: NavItem): string[] {
  return [
    ...(item.href ? [item.href] : []),
    ...(item.matchPrefixes ?? []),
    ...(item.tabs ?? []).flatMap((tab) => [tab.href, ...(tab.matchPrefixes ?? [])]),
  ];
}

export function allItems(): NavItem[] {
  return NAVIGATION.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
}

/**
 * El ítem activo es el de la coincidencia MÁS LARGA: `/dashboard/dia-d`
 * activa "Día D en vivo" y no también "Inicio" (`/dashboard`);
 * `/users/productivity/ranking` activa "Líderes" y no "Usuarios" (`/users`).
 */
export function findActiveItem(pathname: string): NavItem | null {
  let best: { item: NavItem; length: number } | null = null;
  for (const item of allItems()) {
    for (const prefix of itemPrefixes(item)) {
      if (matches(pathname, prefix) && (!best || prefix.length > best.length)) {
        best = { item, length: prefix.length };
      }
    }
  }
  return best?.item ?? null;
}

/** Dentro de una sección, la pestaña de la coincidencia más larga. */
export function findActiveTab(item: NavItem, pathname: string): NavTab | null {
  let best: { tab: NavTab; length: number } | null = null;
  for (const tab of item.tabs ?? []) {
    for (const prefix of [tab.href, ...(tab.matchPrefixes ?? [])]) {
      if (matches(pathname, prefix) && (!best || prefix.length > best.length)) {
        best = { tab, length: prefix.length };
      }
    }
  }
  return best?.tab ?? null;
}
