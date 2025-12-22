'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Trophy, Medal, TrendingUp, User as UserIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Leader {
  id: string;
  name: string;
  email: string;
  totalVotes: number;
  goal?: number; 
}

export function LeaderRanking({ leaders }: { leaders: Leader[] }) {

  // Calculamos el máximo de votos para generar las barras de progreso relativas
  const maxVotes = leaders.length > 0 ? Math.max(...leaders.map(l => l.totalVotes)) : 0;

  // Helper para asignar medallas visuales
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0: // Oro
        return (
            <div className="relative">
                <Trophy className="h-6 w-6 text-yellow-500 fill-yellow-500 animate-pulse drop-shadow-sm" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
        );
      case 1: // Plata
        return <Medal className="h-5 w-5 text-slate-400 fill-slate-100" />;
      case 2: // Bronce
        return <Medal className="h-5 w-5 text-orange-400 fill-orange-100" />;
      default:
        return <span className="text-xs font-bold text-slate-400 w-6 text-center block">#{index + 1}</span>;
    }
  };

  return (
    <Card className="col-span-3 border-t-4 border-t-[#1B2541] shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner">
                    <TrendingUp className="h-5 w-5 text-[#1B2541]" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl text-[#1B2541]">Ranking de Líderes</CardTitle>
                        
                        {/* Tooltip de Información */}
                        <TooltipProvider>
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px] bg-[#1B2541] text-white border-0">
                                    <p>Lista de los usuarios con mayor desempeño en captación de votos durante el periodo actual.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <CardDescription>Top captadores de votos este mes.</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {leaders.map((leader, index) => {
            // Calcular porcentaje relativo al líder #1
            const relativePercent = maxVotes > 0 ? (leader.totalVotes / maxVotes) * 100 : 0;

            return (
                <div 
                    key={leader.id} 
                    className={cn(
                        "relative group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ease-out",
                        "hover:shadow-md hover:scale-[1.02] cursor-default", // Efecto Dinámico de escala
                        // Estilos específicos para el Top 1
                        index === 0 
                            ? "bg-yellow-50/50 border-yellow-200" 
                            : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50"
                    )}
                >
                  {/* Barra de Progreso de Fondo (Sutil) */}
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-current opacity-10 rounded-b-xl transition-all duration-500" 
                    style={{ 
                        width: `${relativePercent}%`,
                        color: index === 0 ? '#E11D48' : '#1B2541'
                    }}
                  />

                  <div className="flex items-center space-x-4 z-10">
                    {/* Indicador de Rango */}
                    <div className="flex-shrink-0 flex items-center justify-center w-8">
                        {getRankBadge(index)}
                    </div>

                    {/* Avatar */}
                    <Avatar className={cn(
                        "h-10 w-10 border-2 shadow-sm transition-transform group-hover:rotate-3",
                        index === 0 ? "border-yellow-400" : "border-white"
                    )}>
                      <AvatarFallback className="bg-[#1B2541] text-[#FFC400] font-black text-sm">
                        {leader.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex flex-col">
                      <p className={cn(
                          "text-sm font-bold leading-none transition-colors",
                          index === 0 ? "text-[#1B2541]" : "text-slate-700 group-hover:text-[#1B2541]"
                      )}>
                          {leader.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">
                          {leader.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right z-10">
                    <div className={cn(
                        "font-black text-lg transition-transform group-hover:scale-110 origin-right",
                        index === 0 ? "text-[#E11D48]" : "text-[#1B2541]" 
                    )}>
                        {leader.totalVotes}
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Votos
                    </p>
                  </div>
                </div>
            );
          })}

          {leaders.length === 0 && (
              <div className="text-center py-10 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-xl border border-dashed">
                  <UserIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Aún no hay datos registrados.</p>
                  <p className="text-xs text-slate-400">Los líderes aparecerán aquí cuando registren votos.</p>
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}