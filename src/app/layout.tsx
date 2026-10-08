import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Letra de la marca Zyron, solo para títulos (ver `--font-display` en globals.css).
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  // Título estático (Next.js resuelve `metadata` server-side, antes de saber
  // a qué organización pertenece quien visita) — es el default de
  // PLATAFORMA (Zyron), mismo criterio que `DEFAULT_BRANDING`
  // en `lib/api/branding.ts`. El logo/color por organización sigue
  // aplicándose en runtime vía `ApplyTheme`, esto es solo la pestaña del
  // navegador antes de que eso cargue.
  title: "Zyron",
  description: "Campaña, despacho e inteligencia política en una sola plataforma",
  applicationName: "Zyron",
  // Fase 4 "Líderes y celular" (2026-10-06): instalable en el celular. El
  // manifiesto sale de `app/manifest.ts`; esto es lo que pide iPhone aparte.
  appleWebApp: { capable: true, title: "Zyron", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Color de la barra del sistema cuando abre como aplicación instalada.
export const viewport: Viewport = {
  themeColor: "#0B1728",
};

// Validación en pantalla (2026-10-07): todos los formularios se envían con
// JavaScript, pero mientras la página termina de cargar ese código todavía no
// está activo. Si alguien enviaba el formulario en ese instante (conexión
// lenta, un gestor de contraseñas que llena y envía solo), el navegador hacía
// un envío nativo por GET y dejaba los datos en la dirección: en el inicio de
// sesión, `/login?email=…&password=…` — la contraseña a la vista, en el
// historial y en el registro del servidor web. Este guion corre antes que
// cualquier otro y bloquea ese envío nativo; cuando React ya está activo no
// estorba, porque sus manejadores cancelan el envío nativo de todas formas.
// Solo deja pasar los formularios que declaran un `action` propio.
const BLOCK_NATIVE_FORM_SUBMIT = `document.addEventListener('submit',function(e){var f=e.target;if(f&&f.tagName==='FORM'&&!f.hasAttribute('action'))e.preventDefault();},true);`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: BLOCK_NATIVE_FORM_SUBMIT }} />
       <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
