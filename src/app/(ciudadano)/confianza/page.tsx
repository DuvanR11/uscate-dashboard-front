import type { Metadata } from 'next';
import {
  ShieldCheck,
  Lock,
  Building2,
  KeyRound,
  FileWarning,
  ScrollText,
  Search,
  Webhook,
  DatabaseBackup,
  Gauge,
  MailCheck,
} from 'lucide-react';

// Página pública de confianza/seguridad (Track C de Ruta 2027,
// 2026-09-09) — describe la PLATAFORMA en sí (nunca una
// organización cliente puntual), pensada para una conversación de venta
// ANTES de que exista un cliente. Contenido estático a propósito: cada
// afirmación de acá fue verificada contra el código/config real antes de
// escribirse (nunca una promesa de marketing sin respaldo real) — ver
// memoria `pagina-confianza-seguridad-plan`. Actualizada en la Fase 4
// "Salida al mercado" (2026-09-27): respaldos automáticos (2026-09-26) y
// límite de peticiones (@nestjs/throttler) ya existen y están verificados en
// producción, así que ahora sí se describen. Sigue sin afirmar nada que no
// sea cierto hoy (p. ej., no hay CAPTCHA).
//
// Fase 5 "Verificar lo que se vende" (2026-10-07): la sección de archivos
// decía que TODO archivo pasa por antivirus, y no era así — el antivirus solo
// revisaba la evidencia que descarga el módulo de investigación. Se extendió a
// gestión documental y a los adjuntos públicos de denuncias, y el texto nombra
// exactamente esos tres casos (las imágenes de eventos, los logos y las
// evidencias de misiones NO pasan por antivirus). El resto describe lo que se
// comprobó subiendo archivos reales: documentos privados con enlace temporal,
// versiones con huella y rechazo de archivos disfrazados. Se agregó
// la regla de envíos solo a quien autorizó (Fase 1) y el cifrado de las
// credenciales de terceros. La marca pública es JuryTech Solutions, como en
// el resto de páginas sin sesión.

export const metadata: Metadata = {
  title: 'Seguridad y confianza — JuryTech Solutions',
  description:
    'Cómo JuryTech Solutions protege los datos de tu campaña: cifrado, aislamiento entre organizaciones, control de acceso, cumplimiento legal y auditoría.',
};

interface Section {
  icon: React.ElementType;
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    icon: Lock,
    title: 'Cifrado en tránsito',
    body: 'Todo el tráfico entre tu equipo, tus votantes y nuestros servidores viaja cifrado por HTTPS/TLS. Cualquier intento de conexión sin cifrar se redirige automáticamente a la versión segura — nunca se acepta tráfico plano.',
  },
  {
    icon: Building2,
    title: 'Aislamiento entre organizaciones',
    body: 'Cada campaña vive en un compartimento propio: los datos de prospectos, eventos, comunicaciones e investigaciones de tu organización nunca son visibles para otra. Esta separación está reforzada a nivel de código en cada consulta a la base de datos — no depende solo de que la aplicación "se acuerde" de filtrar bien.',
  },
  {
    icon: KeyRound,
    title: 'Control de acceso granular',
    body: 'El acceso de cada persona de tu equipo se define por rol y, cuando hace falta, por excepción individual — nunca "todo o nada". Un secretario, un líder territorial y un abogado ven exactamente lo que su función necesita, ni más ni menos, y cada acción sensible pasa por una verificación de permisos real en el servidor.',
  },
  {
    icon: ShieldCheck,
    title: 'Contraseñas y credenciales',
    body: 'Ninguna contraseña se guarda en texto plano: se protegen con un algoritmo de hash de una sola vía (bcrypt) desde el primer registro. Ni siquiera nuestro propio equipo puede leer la contraseña original de un usuario. Las sesiones vencen solas y se pueden cerrar todas a la vez; cambiar la contraseña cierra las sesiones abiertas. Las credenciales de servicios de terceros que conecta cada organización se guardan cifradas (AES-256-GCM).',
  },
  {
    icon: FileWarning,
    title: 'Archivos y documentos',
    body: 'Los documentos de gestión son privados: solo se abren con un enlace temporal, de dos minutos, que la plataforma entrega después de comprobar la sesión y el permiso de quien lo pide. Cada versión conserva su huella digital (SHA-256) y queda registro de quién la subió, la descargó o la eliminó; lo eliminado va a una papelera y se puede restaurar. El contenido de los documentos, los adjuntos de denuncias y los logos se valida contra lo que dice ser — una imagen disfrazada de PDF, por ejemplo, se rechaza. Los documentos de gestión, los adjuntos de denuncias y la evidencia que recopila el módulo de investigación pasan además por un antivirus: si detecta una amenaza, o si no puede revisar el archivo, el archivo no se guarda.',
  },
  {
    icon: ScrollText,
    title: 'Cumplimiento de datos personales (Ley 1581 de 2012)',
    body: 'Cada persona que registra sus datos da un consentimiento real, con fecha y versión de la política vigente — no una casilla que ya viene marcada. Cualquier ciudadano puede ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición a través de un portal público sin necesidad de crear cuenta, con plazos de respuesta reales. Al cancelar sus datos, la información se anonimiza — nunca se borra de forma que rompa la trazabilidad de registros legítimos ya existentes (asistencias, comunicaciones previas).',
  },
  {
    icon: MailCheck,
    title: 'Envíos solo a quien autorizó',
    body: 'Un contacto sin autorización de tratamiento de datos se puede guardar, pero no recibe correos ni mensajes de texto masivos, invitaciones a eventos ni mensajes automáticos hasta que la persona autorice o el equipo registre esa autorización, con fecha. Quien carga una base de contactos declara de dónde viene la autorización y eso queda registrado. Quien pide no recibir más mensajes entra a una lista de exclusión que todos los envíos respetan.',
  },
  {
    icon: Search,
    title: 'Investigaciones con cadena de custodia defendible',
    body: 'Para el módulo de investigación (OSINT), cada pieza de evidencia queda protegida con un hash criptográfico (SHA-256) que permite verificar que no fue alterada después de recolectarse. Los casos tienen políticas de retención reales por tipo de dato, y un caso puede marcarse bajo retención legal para congelar su purga automática mientras sea necesario para un proceso real. Todo el historial de auditoría de un caso se puede exportar en un paquete verificable.',
  },
  {
    icon: DatabaseBackup,
    title: 'Respaldos automáticos diarios',
    body: 'La base de datos se respalda automáticamente todos los días y cada copia se verifica antes de darse por buena. Se guarda una copia fuera del servidor principal, con 30 respaldos diarios y 12 mensuales, y cada semana se restaura un respaldo en un entorno aparte para comprobar que de verdad sirve para recuperar la información.',
  },
  {
    icon: Gauge,
    title: 'Protección contra abuso',
    body: 'Los puntos de entrada sensibles —inicio de sesión, recuperación de contraseña y formularios públicos— limitan cuántas solicitudes acepta cada dirección en un periodo corto, lo que frena los intentos automatizados de adivinar contraseñas o saturar el sistema.',
  },
  {
    icon: Webhook,
    title: 'Integraciones externas autenticadas',
    body: 'Cualquier sistema externo que se conecte a la plataforma (por ejemplo, automatizaciones) debe presentar un secreto compartido que se compara de forma segura contra intentos de adivinación por tiempo de respuesta. Sin ese secreto configurado correctamente, la conexión se rechaza — nunca queda abierta por defecto.',
  },
];

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#1B2541] text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="mx-auto inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 text-[#FFC400] mb-5">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-bold">Seguridad y confianza</h1>
          <p className="mt-3 text-slate-300 leading-relaxed">
            La plataforma de JuryTech Solutions maneja datos sensibles de campañas y despachos —
            votantes, comunicaciones, investigaciones. Así es como los protegemos hoy, en detalle y sin rodeos.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-100 p-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[#1B2541]/5 text-[#1B2541] flex items-center justify-center">
                <Icon size={20} />
              </div>
              <div>
                <h2 className="font-bold text-[#1B2541] mb-1.5">{section.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
              </div>
            </div>
          );
        })}

        <p className="text-xs text-slate-400 text-center pt-4">
          ¿Preguntas puntuales sobre cómo tratamos tus datos como ciudadano? Consulta nuestra{' '}
          <a href="/privacidad" className="underline hover:text-slate-600">
            política de tratamiento de datos personales
          </a>
          .
        </p>
      </div>
    </div>
  );
}
