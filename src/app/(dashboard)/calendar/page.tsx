'use client';

import dynamic from 'next/dynamic';

// Importación dinámica para evitar errores de renderizado en servidor (SSR)
// ya que react-big-calendar usa 'window' internamente.
const CalendarView = dynamic(() => import('@/components/dashboard/calendar/calendar-view'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full flex items-center justify-center text-blue-800">Cargando Agenda...</div>
});

export default function CalendarPage() {
  return (
    <div className="h-full">
      <CalendarView />
    </div>
  );
}