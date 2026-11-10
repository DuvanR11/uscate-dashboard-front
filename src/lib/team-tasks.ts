import type { TaskAudience, TaskEvidence, TaskPriority } from '@/types/gamification';

// Plan hacia la versión estable, Fase 3b (2026-11-10): textos de las tareas
// del equipo. La regla de quién ve qué vive en el servidor
// (`task-audience.ts`); aquí solo cómo se llama cada opción.

export const EVIDENCE_LABEL: Record<TaskEvidence, string> = {
  SCREENSHOT: 'Captura de pantalla',
  PHOTO: 'Foto',
  DOCUMENT: 'Documento (PDF o imagen)',
  LOCATION: 'Ubicación',
  LINK: 'Enlace',
  NOTE: 'Nota',
};

export const FIELD_EVIDENCE_OPTIONS: TaskEvidence[] = ['PHOTO', 'DOCUMENT', 'LOCATION', 'LINK', 'NOTE'];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
};

const ROLE_AUDIENCE_LABEL: Record<string, string> = {
  BUHO: 'Voluntarios',
  LEADER: 'Líderes',
  COORDINATOR: 'Coordinadores',
};

/** Las opciones de «Para quién» se guardan en un solo valor del selector. */
export type AudienceChoice =
  | 'ROLE:BUHO'
  | 'ROLE:LEADER'
  | 'ROLE:COORDINATOR'
  | 'FIELD_TEAM'
  | 'TEAM'
  | 'PERSON';

export const ADMIN_AUDIENCE_OPTIONS: { value: AudienceChoice; label: string }[] = [
  { value: 'ROLE:BUHO', label: 'Voluntarios' },
  { value: 'ROLE:LEADER', label: 'Líderes' },
  { value: 'ROLE:COORDINATOR', label: 'Coordinadores' },
  { value: 'FIELD_TEAM', label: 'Todo el equipo en terreno' },
  { value: 'PERSON', label: 'Una persona' },
];

export const COORDINATOR_AUDIENCE_OPTIONS: { value: AudienceChoice; label: string }[] = [
  { value: 'TEAM', label: 'Mi equipo' },
  { value: 'PERSON', label: 'Una persona de mi equipo' },
];

export function audienceChoiceOf(audience: TaskAudience, audienceRole?: string | null): AudienceChoice {
  if (audience === 'ROLE') return `ROLE:${audienceRole ?? 'BUHO'}` as AudienceChoice;
  return audience as AudienceChoice;
}

export function audienceFields(choice: AudienceChoice): { audience: TaskAudience; audienceRole?: string } {
  if (choice.startsWith('ROLE:')) return { audience: 'ROLE', audienceRole: choice.slice(5) };
  return { audience: choice as TaskAudience };
}

export function audienceLabel(task: {
  audience: TaskAudience;
  audienceRole?: string | null;
  assignee?: { fullName: string } | null;
  createdBy?: { fullName: string } | null;
}): string {
  switch (task.audience) {
    case 'ROLE':
      return ROLE_AUDIENCE_LABEL[task.audienceRole ?? ''] ?? 'Un rol';
    case 'FIELD_TEAM':
      return 'Todo el equipo en terreno';
    case 'TEAM':
      return task.createdBy ? `Equipo de ${task.createdBy.fullName}` : 'Equipo de un Coordinador';
    case 'PERSON':
      return task.assignee?.fullName ?? 'Una persona';
    default:
      return '';
  }
}
