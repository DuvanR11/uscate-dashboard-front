import { LucideIcon, TrendingUp } from 'lucide-react';

type Props = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
};

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color = 'blue',
}: Props) {
  const styles = {
    blue: {
      icon: 'bg-blue-50 text-blue-700',
      border: 'hover:border-blue-200',
      glow: 'group-hover:bg-blue-50',
      value: 'text-blue-900',
      trend: 'text-blue-700',
    },
    green: {
      icon: 'bg-emerald-50 text-emerald-700',
      border: 'hover:border-emerald-200',
      glow: 'group-hover:bg-emerald-50',
      value: 'text-emerald-900',
      trend: 'text-emerald-700',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700',
      border: 'hover:border-amber-200',
      glow: 'group-hover:bg-amber-50',
      value: 'text-amber-900',
      trend: 'text-amber-700',
    },
    red: {
      icon: 'bg-rose-50 text-rose-700',
      border: 'hover:border-rose-200',
      glow: 'group-hover:bg-rose-50',
      value: 'text-rose-900',
      trend: 'text-rose-700',
    },
    purple: {
      icon: 'bg-purple-50 text-purple-700',
      border: 'hover:border-purple-200',
      glow: 'group-hover:bg-purple-50',
      value: 'text-purple-900',
      trend: 'text-purple-700',
    },
  };

  const current = styles[color];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${current.border}`}
    >
      {/* Glow effect */}
      <div
        className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-slate-100 opacity-40 blur-3xl transition-all duration-300 ${current.glow}`}
      />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
            {title}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 transition-transform duration-200 group-hover:scale-110 ${current.icon}`}
        >
          <Icon size={20} />
        </div>
      </div>

      {/* Value */}
      <div className="relative z-10 mt-5">
        <p
          className={`text-3xl font-extrabold tracking-tight ${current.value}`}
        >
          {value}
        </p>
      </div>

      {/* Trend */}
      {trend && (
        <div className="relative z-10 mt-4 flex items-center gap-2">
          <TrendingUp
            size={14}
            className={current.trend}
          />

          <span
            className={`text-xs font-semibold ${current.trend}`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}