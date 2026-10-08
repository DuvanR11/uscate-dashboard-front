import { Metadata } from 'next';
import PublicEventPage from '@/components/dashboard/events/pu/page';

type Props = {
  params: Promise<{ slug: string }>
};

// --- ESTA FUNCIÓN GENERA LA TARJETA DE WHATSAPP ---
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  // 1. Buscamos los datos del evento (Fetch directo)
  // Nota: Si 'api' usa axios con tokens de localStorage, aquí fallará. 
  // Mejor usa un fetch simple a tu backend público.
  const { slug } = await params;
  
  try {
    // Reemplaza con la URL real de tu backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/events/${slug}`, {
        cache: 'no-store' // Para que siempre traiga datos frescos
    });
    
    const event = await response.json();

    if (!event) {
        return { title: 'Evento no encontrado' };
    }

    // 2. Retornamos la configuración para WhatsApp/Facebook
    return {
      title: event.name, // Título en negrita de WhatsApp
      description: event.description || 'Regístrate a este evento.', // Texto pequeño abajo
      openGraph: {
        title: event.name,
        description: event.description,
        // Si tienes imagen, la usamos. Si no, una por defecto.
        images: [event.imageUrl || 'https://app.jurytechsolutions.com/icons/icon-512.png'], 
      },
    };
  } catch {
    return {
      title: 'Campaña Inteligente',
      description: 'Registro de eventos'
    };
  }
}

// --- ESTE ES EL COMPONENTE QUE RENDERIZA LA PÁGINA ---
export default function Page() {
  // Simplemente llamamos a tu componente cliente original
  return <PublicEventPage />;
}
