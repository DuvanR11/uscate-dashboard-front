import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Despliegue en DigitalOcean (2026-09-04): imagen Docker de producción
  // copia SOLO `.next/standalone` (que ya trae su propio `node_modules`
  // mínimo, trazado por Next a partir de lo que el server realmente usa)
  // en vez de `node_modules` completo — reduce el tamaño real de la imagen
  // de forma considerable en un Droplet de 4GB donde cada MB de imagen
  // cuenta.
  output: "standalone",
  // Revisión técnica, Fase 1 (2026-10-15): el dominio de las pantallas no
  // mandaba NINGUNA cabecera de seguridad (la API sí, con helmet). La
  // protección contra incrustación (clickjacking) va en `middleware.ts`, solo
  // para las pantallas privadas: las públicas se pueden incrustar en la página
  // de una campaña, como hasta ahora.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
