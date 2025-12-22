import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChartData {
  date: string; // Formato YYYY-MM-DD que viene del backend
  count: number;
}

export function groupDataByWeek(dailyData: ChartData[], startDate: Date, endDate: Date) {
  const weeklyData = [];
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Lunes

  // Iteramos semana a semana desde el inicio hasta el fin del filtro
  while (currentWeekStart <= endDate) {
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    // Filtramos y sumamos los registros que caen en esta semana
    const totalInWeek = dailyData.reduce((acc, item) => {
      const itemDate = parseISO(item.date);
      if (isWithinInterval(itemDate, { start: currentWeekStart, end: currentWeekEnd })) {
        return acc + item.count;
      }
      return acc;
    }, 0);

    // Formateamos la etiqueta (Ej: "12 Dic - 18 Dic")
    const label = `${format(currentWeekStart, 'd MMM', { locale: es })} - ${format(currentWeekEnd, 'd MMM', { locale: es })}`;

    weeklyData.push({
      name: label, // Esto va al Eje X
      prospects: totalInWeek,
      events: 0, // Aquí sumarías tus eventos si tuvieras la fecha exacta
      fullDate: currentWeekStart.toISOString() // Para referencia
    });

    // Avanzamos a la siguiente semana
    currentWeekStart = addWeeks(currentWeekStart, 1);
  }

  return weeklyData;
}