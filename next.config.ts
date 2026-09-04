import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Despliegue en DigitalOcean (2026-09-04): imagen Docker de producción
  // copia SOLO `.next/standalone` (que ya trae su propio `node_modules`
  // mínimo, trazado por Next a partir de lo que el server realmente usa)
  // en vez de `node_modules` completo — reduce el tamaño real de la imagen
  // de forma considerable en un Droplet de 4GB donde cada MB de imagen
  // cuenta.
  output: "standalone",
};

export default nextConfig;
