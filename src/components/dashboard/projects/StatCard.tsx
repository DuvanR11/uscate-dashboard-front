import { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  value: string | number;
  icon: LucideIcon;
};

export function StatCard({ title, value, icon: Icon }: Props) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <div className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#1B2541]">
        {value}
      </p>
    </div>
  );
}