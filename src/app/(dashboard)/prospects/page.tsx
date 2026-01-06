'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { DataTable } from "@/components/ui/data-table"; // Asegúrate que este sea el archivo modificado anteriormente
import { columns } from "@/components/dashboard/prospects/columns";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Loader2, 
  Phone, 
  Mail, 
  FileText,
  ChevronDown, 
  LayoutDashboard,
  UserPlus
} from "lucide-react";
import { ProspectsToolbarServer } from "@/components/dashboard/prospects/ProspectsToolbarServer";
import { useAuthStore } from "@/store/auth-store"; 
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FacetOption {
  label: string;
  value: string;
}

interface FacetsState {
  segments: FacetOption[];
  occupations: FacetOption[];
  leaders: FacetOption[];
  tags: FacetOption[];
  localities: FacetOption[]
}

export default function ProspectsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore(); 
  
  const [data, setData] = useState<any[]>([]); 
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Estado para el total de páginas que devuelve el backend
  const [pageCount, setPageCount] = useState(0);

  const [facets, setFacets] = useState<FacetsState>({
      segments: [],
      occupations: [],
      leaders: [],
      tags: [],
      localities: []
  });

  const isLeader = user?.role?.code === 'LEADER'

  // 1. Cargar Catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
        if (!user) return;

        try {
            const roleCode = user.role?.code || '';
            const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(roleCode);

            const promises = [
                api.get('/catalogs/segments'),
                api.get('/catalogs/occupations'),
                api.get('/catalogs/tags'),
                api.get('/catalogs/localities')
            ];

            if (isAdmin) {
                promises.push(api.get('/users?roles=LEADER'));
            }

            const results = await Promise.all(promises);

            const segmentsData: FacetOption[] = results[0].data.map((i: any) => ({ label: i.name, value: i.name }));
            const occupationsData: FacetOption[] = results[1].data.map((i: any) => ({ label: i.name, value: i.name }));
            const tagsData: FacetOption[] = results[2].data.map((i: any) => ({ label: i.name, value: i.name }));
            const localitiesData = results[3].data.map((i: any) => ({ 
                label: i.name,      
                value: String(i.id)
            }));

            let leadersData: FacetOption[] = [];
            
            if (isAdmin && results[3]) {
                const usersResponse = results[3].data;
                const usersList = Array.isArray(usersResponse) ? usersResponse : usersResponse.data;
                leadersData = usersList.map((i: any) => ({ label: i.fullName, value: i.fullName }));
            }

            setFacets({
                segments: segmentsData,
                occupations: occupationsData,
                leaders: leadersData,
                tags: tagsData,
                localities: localitiesData
            });

        } catch (e) { 
            console.error("Error loading facets", e); 
        }
    };
    
    loadCatalogs();
  }, [user]);

  // 2. Cargar Prospectos (Trigger: cambio en URL searchParams)
  useEffect(() => {
    const fetchProspects = async () => {
      setLoading(true);
      try {
        // Convertimos los searchParams a objeto para axios
        const params = Object.fromEntries(searchParams.entries());
        
        const response = await api.get('/prospects', { params });
        
        setData(response.data.data);
        setTotalRecords(response.data.meta.total);
        // IMPORTANTE: Guardamos el número total de páginas
        setPageCount(response.data.meta.lastPage);
      } catch (error) {
        console.error("Error fetching data", error);
        // Opcional: setData([]) en caso de error
      } finally {
        setLoading(false);
      }
    };

    fetchProspects();
  }, [searchParams]);

  const handleExportCsv = async (type: 'all' | 'phones' | 'emails') => {
    try {
      setExporting(true);
      const params = new URLSearchParams(searchParams.toString());
      
      // Agregamos el tipo de exportación a la URL
      params.set('type', type); 
      
      // Llamada API (Nota: api.get devuelve axios response)
      const response = await api.get(`/prospects/export?${params.toString()}`, { 
        responseType: 'blob' 
      });

      // Crear link de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Nombre del archivo dinámico
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `base_${type}_${date}.csv`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Descarga iniciada");
    } catch (error) {
      console.error("Error export", error);
      toast.error("Error al exportar");
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
         <h2 className="text-3xl font-bold text-[#1B2541]">Prospectos</h2>
         
         <div className="flex gap-2 w-full sm:w-auto">
             
             {isLeader && (
                 <Link href="/leader" className="w-full sm:w-auto">
                    <Button 
                        variant="outline" 
                        className="w-full border-[#FFC400] text-yellow-700 hover:bg-[#FFC400]/10 hover:text-yellow-800 font-bold"
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Ver mis Estadísticas
                    </Button>
                 </Link>
             )}

             {/* BOTÓN DE EXPORTAR AÑADIDO */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                      variant="outline"
                      className="w-full sm:w-auto border-slate-300 min-w-[140px]"
                      disabled={exporting || loading}
                  >
                      {exporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Download className="mr-2 h-4 w-4" />
                      )}
                      Exportar
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportCsv('all')}>
                    <FileText className="mr-2 h-4 w-4" /> Todo (Completo)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportCsv('phones')}>
                    <Phone className="mr-2 h-4 w-4" /> Solo Teléfonos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportCsv('emails')}>
                    <Mail className="mr-2 h-4 w-4" /> Solo Emails
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

             <Link href="/prospects/new" className="w-full sm:w-auto">
                <Button className="bg-[#1B2541] w-full">
                    <UserPlus className="mr-2 h-4 w-4" /> Nuevo
                </Button>
             </Link>
         </div>
      </div>

      <DataTable 
          columns={columns} 
          data={data}
          pageCount={pageCount}
          totalRecords={totalRecords}
          toolbar={<ProspectsToolbarServer facets={facets} />}
      />
     
    </div>
  );
}