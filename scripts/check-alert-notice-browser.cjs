/* eslint-disable @typescript-eslint/no-require-imports -- Local browser check uses mocked API and no real deliveries. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const origin = process.env.NOTICE_TEST_ORIGIN || 'http://127.0.0.1:3014';
let browser;
async function main() {
  const puppeteer = await import(pathToFileURL(path.resolve(__dirname, '../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  browser = await puppeteer.default.launch({ executablePath: process.env.NOTICE_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  await browser.defaultBrowserContext().setCookie({ name: 'auth-token', value: 'fixture', url: origin }, { name: 'user-permissions', value: '1', url: origin });
  for (const role of ['ADMIN', 'PLATFORM_OPERATOR', 'LEADER']) {
    const page = await browser.newPage(), errors = [], calls = []; let read = false, revoked = false;
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width: role === 'ADMIN' ? 390 : 1440, height: 1000 });
    await page.evaluateOnNewDocument(role => localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'fixture', user: { id: 'fixture', organizationId: 'org', fullName: 'Test', role: { code: role }, permissions: [{ module: 'PLATAFORMA', canRead: true, canWrite: false }] } }, version: 0 })), role);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().startsWith(origin)) return request.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      if (!['xhr', 'fetch'].includes(request.resourceType())) return request.abort();
      const pathname = new URL(request.url()).pathname; let body = null;
      if (['/legal/pending', '/permissions/modules'].includes(pathname)) body = [];
      if (pathname === '/organization/subscription') body = { organization: { id: 'org', name: 'Org', nit: '' }, billing: { status: 'ACTIVE', nextRenewal: '2026-11-01' }, consumption: Object.fromEntries(['sms','email','whatsapp'].map(channel => [channel, { limit: 100, used: 90, remaining: 10, percentage: 90 }])), seats: {}, plan: null };
      if (pathname.startsWith('/organization/billing/alert-notices')) {
        calls.push(request.method());
        if (revoked) return request.respond({ status: 403, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Access revoked' }) });
        if (request.method() === 'PATCH') { read = true; body = { read: true }; }
        else body = { unread: read ? 0 : 1, audience: role === 'ADMIN' ? 'CLIENT' : 'INTERNAL', items: [{ id: '11111111-1111-4111-8111-111111111111', title: 'SMS: umbral 90% alcanzado', organizationName: 'Org', nextAction: 'Revisa tu saldo', href: '/organization/plan', active: true, readAt: read ? '2026-10-08T01:00:00Z' : null, createdAt: '2026-10-08T01:00:00Z', usage: { used: 90, limit: 100, remaining: 10, periodStart: null, resetAt: null } }] };
      }
      return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${origin}/organization/plan`, { waitUntil: 'networkidle2' });
    if (role === 'LEADER') {
      assert.equal(calls.length, 0); assert.equal(await page.$('button[aria-controls="alert-inbox"]'), null);
    } else {
      await page.waitForSelector('button[aria-label="Avisos: 1 sin leer"]');
      await page.click('button[aria-controls="alert-inbox"]');
      await page.waitForFunction(() => document.body.innerText.includes('SMS: umbral 90% alcanzado'));
      const body = await page.$eval('#alert-inbox', n => n.innerText);
      assert(body.includes('90 / 100 / 10')); assert(body.includes('Contador histórico')); assert(!body.includes('Costo'));
      await page.evaluate(() => [...document.querySelectorAll('#alert-inbox button')].find(n => n.textContent.trim() === 'Marcar leído').click());
      await page.waitForSelector('button[aria-label="Avisos: 0 sin leer"]');
      assert.equal(calls.filter(method => method === 'PATCH').length, 1);
      if (role === 'ADMIN') {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        assert.equal(await page.$eval('#alert-inbox', n => { const box = n.getBoundingClientRect(); return box.left >= 0 && box.right <= window.innerWidth; }), true);
      }
      revoked = true;
      await page.evaluate(() => [...document.querySelectorAll('#alert-inbox button')].find(n => n.textContent.trim() === 'Actualizar').click());
      await page.waitForFunction(() => !document.querySelector('#alert-inbox'));
      assert(!(await page.$eval('body', n => n.innerText)).includes('SMS: umbral 90% alcanzado'));
    }
    assert.deepEqual(errors, []); console.log(`Alert notices browser: ${role} passed.`); await page.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
