import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  // Título estático (Next.js resuelve `metadata` server-side, antes de saber
  // a qué organización pertenece quien visita) — es el default de
  // PLATAFORMA (JuryTech Solutions), mismo criterio que `DEFAULT_BRANDING`
  // en `lib/api/branding.ts`. El logo/color por organización sigue
  // aplicándose en runtime vía `ApplyTheme`, esto es solo la pestaña del
  // navegador antes de que eso cargue.
  title: "JuryTech Solutions",
  description: "CRM político, inteligencia legislativa y OSINT en una sola plataforma",
  // Fase 4 "Líderes y celular" (2026-10-06): instalable en el celular. El
  // manifiesto sale de `app/manifest.ts`; esto es lo que pide iPhone aparte.
  appleWebApp: { capable: true, title: "JuryTech", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Color de la barra del sistema cuando abre como aplicación instalada.
export const viewport: Viewport = {
  themeColor: "#1B2541",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
       <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
