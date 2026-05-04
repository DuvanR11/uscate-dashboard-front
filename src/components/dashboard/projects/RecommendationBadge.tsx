export function RecommendationBadge({
  value,
}: {
  value?: 'FAVOR' | 'CONTRA' | 'ABSTENCION' | string;
}) {
  // Ajustamos los colores para que resalten perfectamente en un fondo blanco (Light Mode)
  const styles =
    value === 'FAVOR'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : value === 'CONTRA'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : value === 'ABSTENCION' 
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-slate-50 text-slate-600 border-slate-200'; // Estilo por defecto

  return (
    <span 
      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm ${styles}`}
    >
      {value || 'SIN RECOMENDACIÓN'}
    </span>
  );
}