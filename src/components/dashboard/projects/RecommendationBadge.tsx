export function RecommendationBadge({
  value,
}: {
  value?: 'FAVOR' | 'CONTRA' | 'ABSTENCION' | 'MODIFICAR' | 'REVISAR' | string;
}) {
  const normalized = normalizeRecommendation(value);

  const styles =
    normalized === 'FAVOR'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : normalized === 'CONTRA'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : normalized === 'MODIFICAR'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : normalized === 'ABSTENCION'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : normalized === 'REVISAR'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm sm:text-xs ${styles}`}
    >
      {getRecommendationLabel(normalized)}
    </span>
  );
}

function normalizeRecommendation(value?: string) {
  const normalized = (value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalized === 'A FAVOR') return 'FAVOR';
  if (normalized === 'EN CONTRA') return 'CONTRA';
  if (normalized === 'ABSTENCION' || normalized === 'ABSTENCIÓN') {
    return 'ABSTENCION';
  }
  if (normalized === 'MODIFICAR') return 'MODIFICAR';
  if (normalized === 'REVISAR') return 'REVISAR';

  return normalized || 'SIN_RECOMENDACION';
}

function getRecommendationLabel(value: string) {
  if (value === 'SIN_RECOMENDACION') return 'SIN RECOMENDACIÓN';
  if (value === 'ABSTENCION') return 'ABSTENCIÓN';

  return value;
}