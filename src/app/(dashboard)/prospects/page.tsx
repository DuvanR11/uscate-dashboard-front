'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { DataTable } from "@/components/ui/data-table"; // Asegúrate que este sea el archivo modificado anteriormente
import { columns } from "@/components/dashboard/prospects/columns";
import { Button } from "@/components/ui/button";
import { UserPlus, LayoutDashboard } from "lucide-react";
import { ProspectsToolbarServer } from "@/components/dashboard/prospects/ProspectsToolbarServer";
import { useAuthStore } from "@/store/auth-store"; 

interface FacetOption {
  label: string;
  value: string;
}

interface FacetsState {
  segments: FacetOption[];
  occupations: FacetOption[];
  leaders: FacetOption[];
  tags: FacetOption[];
}

export default function ProspectsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore(); 
  
  const [data, setData] = useState<any[]>([]); 
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Estado para el total de páginas que devuelve el backend
  const [pageCount, setPageCount] = useState(0);

  const [facets, setFacets] = useState<FacetsState>({
      segments: [],
      occupations: [],
      leaders: [],
      tags: []
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
                api.get('/catalogs/tags')
            ];

            if (isAdmin) {
                promises.push(api.get('/users?roles=LEADER'));
            }

            const results = await Promise.all(promises);

            const segmentsData: FacetOption[] = results[0].data.map((i: any) => ({ label: i.name, value: i.name }));
            const occupationsData: FacetOption[] = results[1].data.map((i: any) => ({ label: i.name, value: i.name }));
            const tagsData: FacetOption[] = results[2].data.map((i: any) => ({ label: i.name, value: i.name }));

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
                tags: tagsData
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

             <Link href="/prospects/new" className="w-full sm:w-auto">
                <Button className="bg-[#1B2541] w-full">
                    <UserPlus className="mr-2 h-4 w-4" /> Nuevo
                </Button>
             </Link>
         </div>
      </div>

      {/* OPCIÓN A: Pasar el toolbar DENTRO de la tabla (más integrado)
        <DataTable 
           columns={columns} 
           data={data}
           pageCount={pageCount}
           toolbar={<ProspectsToolbarServer facets={facets} />}
        />
      */}

      {/* OPCIÓN B (La que tenías): Toolbar fuera y tabla abajo. Funciona igual. */}
      <ProspectsToolbarServer facets={facets} />

      <DataTable 
          columns={columns} 
          data={data}
          pageCount={pageCount} // <--- AQUÍ CONECTAMOS LA PAGINACIÓN SERVER-SIDE
      />
      
    </div>
  );
}