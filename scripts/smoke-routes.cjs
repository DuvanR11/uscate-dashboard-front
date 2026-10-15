/* eslint-disable @typescript-eslint/no-require-imports -- guion de Node (CommonJS) que corre el CI. */
// Revisión técnica, Fase 4 (2026-10-15): prueba de humo de las pantallas en
// el CI. Arranca el compilado (`.next/standalone/server.js`) y comprueba lo
// que no necesita la API: que las páginas abran, las cabeceras de seguridad,
// la protección contra incrustación y que una pantalla privada sin sesión
// mande al inicio de sesión. Antes el CI solo compilaba y pasaba el lint.
//   node scripts/smoke-routes.cjs   (después de `npm run build`)
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = Number(process.env.SMOKE_PORT || 3123);
const BASE = `http://127.0.0.1:${PORT}`;
const server = path.join(__dirname, '..', '.next', 'standalone', 'server.js');

const checks = [
  {
    name: 'inicio de sesión abre con cabeceras de seguridad y protección de marco',
    path: '/login',
    expect: (r) =>
      r.status === 200 &&
      r.headers.get('x-frame-options') === 'SAMEORIGIN' &&
      /frame-ancestors 'self'/.test(r.headers.get('content-security-policy') || '') &&
      /max-age=\d+/.test(r.headers.get('strict-transport-security') || '') &&
      r.headers.get('x-content-type-options') === 'nosniff',
  },
  {
    name: 'una página pública abre y se puede incrustar',
    path: '/join',
    expect: (r) => r.status === 200 && !r.headers.get('x-frame-options'),
  },
  {
    name: 'recuperar contraseña abre',
    path: '/forgot-password',
    expect: (r) => r.status === 200,
  },
  {
    name: 'una pantalla privada sin sesión manda al inicio de sesión',
    path: '/dashboard',
    expect: (r) => r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get('location') || ''),
  },
  {
    name: 'el manifiesto de la aplicación instalable responde sin sesión',
    path: '/manifest.webmanifest',
    expect: (r) => r.status === 200,
  },
];

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/login`, { redirect: 'manual' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('el servidor no arrancó');
}

(async () => {
  const child = spawn(process.execPath, [server], {
    env: { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  let failures = 0;
  try {
    await waitForServer();
    for (const check of checks) {
      const r = await fetch(`${BASE}${check.path}`, { redirect: 'manual' });
      const ok = check.expect(r);
      if (!ok) failures++;
      console.log(`${ok ? 'OK   ' : 'FALLA'} ${check.name} (${check.path} → ${r.status})`);
    }
  } finally {
    child.kill();
  }
  if (failures) {
    console.error(`${failures} comprobación(es) fallaron`);
    process.exit(1);
  }
  console.log('Prueba de humo: todo bien');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
