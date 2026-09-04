import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SpeedInsights/>
       <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
