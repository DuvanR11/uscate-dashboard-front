# Zyron: panel

Panel web de Zyron (`app.jurytechsolutions.com`). Es el único cliente de la API [`api-uscate-back`](https://github.com/Uscategui-TI/api-uscate-back) y no tiene lógica de negocio propia: los permisos, los planes y las reglas se calculan en la API, y el panel solo los usa para mostrar u ocultar pantallas y botones.

| | |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Estado | Zustand |
| Interfaz | Radix/shadcn · Tailwind v4 (tokens en `src/app/globals.css`, sin `tailwind.config.js`) |
| Producción | imagen `standalone` en el droplet, detrás de Nginx |

Next.js 16 cambia varias APIs y convenciones: antes de escribir código, lee la guía correspondiente en `node_modules/next/dist/docs/` (ver [AGENTS.md](AGENTS.md)).

## Arrancar en tu máquina

Requisitos: Node.js 20 y la API corriendo en `http://localhost:3100` (ver el README de `api-uscate-back`).

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:3000
```

Los mapas usan una clave de Google que solo acepta el dominio de producción, así que en `localhost` muestran su aviso en lugar del mapa.

## Comandos

```bash
npm run dev                    # desarrollo
npm run build                  # compilación de producción (output: standalone)
npm run start                  # sirve lo compilado
npm run lint                   # eslint (lo exige la revisión automática)
node scripts/smoke-routes.cjs  # prueba de humo sobre lo compilado (también en la revisión automática)
```

## Estructura

```
src/
  app/
    (auth)/          inicio de sesión y recuperación de contraseña
    (ciudadano)/     páginas públicas sin sesión: registro, eventos, consulta, mis datos, planes…
    (dashboard)/     pantallas privadas, una carpeta por sección del menú
    commercial/      portal comercial
  components/        ui/ (shadcn), dashboard/, platform/, public/, territorial/, billing/, help/…
  lib/               cliente de la API (api.ts), navegación y permisos del menú, fechas, sesión
  store/             estado global (Zustand)
  content/ayuda/     guías del centro de ayuda (generadas desde docs/formacion del workspace)
  middleware.ts      protege las rutas privadas y la incrustación
public/              íconos, marca, contornos del DANE y capturas de las guías
scripts/             pruebas de humo y comprobaciones en navegador
docs/                notas y evidencias de entregas del panel
```

Una pantalla nueva va en `NAVIGATION` (`src/lib/navigation.ts`) con su módulo, o en `UNLISTED_ROUTES`, o se protege sola: el bloqueo de rutas usa esa misma lista. Todo lo que importa una pantalla termina en archivos JavaScript que se descargan sin sesión; ocultarlo en la interfaz no lo protege.

## Publicar

El panel se publica junto con la API, por entregas desde git, con `scripts/deploy/package-commercial-release.ps1` del repositorio de la API. El `Dockerfile` compila con `--webpack` porque Turbopack falla con la tipografía Sora. Las variables `NEXT_PUBLIC_*` se hornean al compilar y viajan como `--build-arg`.
