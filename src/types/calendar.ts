export interface CalendarEvent {
  // Propiedades requeridas por react-big-calendar
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;

  description?: string;
  location?: string;
  imageUrl?: string;

  // Propiedades que vienen de tu Backend (opcionales para el calendario, pero útiles para ti)
  id?: number | string;
  name?: string;     // Tu backend envía 'name'
  startDate?: string;
  endDate?: string;
  status?: string;

  type?: 'PRESENTIAL' | 'VIRTUAL' | 'HYBRID';
}