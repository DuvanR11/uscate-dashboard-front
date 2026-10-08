/* eslint-disable @typescript-eslint/no-require-imports -- Local browser checks use a fully mocked API. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const origin = process.env.ALERT_TEST_ORIGIN || 'http://127.0.0.1:3013';
const alert = { id: '11111111-1111-4111-8111-111111111111', organizationId: 'org', organizationName: 'Organización de prueba', kind: 'QUOTA_THRESHOLD', resource: 'sms', periodKey: 'LEGACY:sub', threshold: 90, severity: 'HIGH', title: 'SMS: umbral 90% alcanzado', nextAction: 'Revisar capacidad', observation: { used: 90, limit: 100, remaining: 10 }, status: 'OPEN', active: true, assigneeId: null, version: 3, observedAt: '2026-10-08T02:00:00Z' };
let browser;
async function main() {
  const puppeteer = await import(pathToFileURL(path.resolve(__dirname, '../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  browser = await puppeteer.default.launch({ executablePath: process.env.ALERT_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  await browser.defaultBrowserContext().setCookie({ name: 'auth-token', value: 'fixture', url: origin }, { name: 'user-permissions', value: '1', url: origin });
  for (const mode of ['reader', 'writer', 'scoped', 'denied']) {
    const page = await browser.newPage(), calls = [], errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewport({ width: mode === 'writer' ? 390 : 1440, height: 1000 });
    await page.evaluateOnNewDocument((write) => localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'fixture', user: { id: 'fixture', fullName: 'Test', role: { code: 'PLATFORM_OPERATOR' }, permissions: [{ module: 'PLATAFORMA', canRead: true, canWrite: write }] } }, version: 0 })), mode === 'writer');
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().startsWith(origin)) return request.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      if (!['xhr', 'fetch'].includes(request.resourceType())) return request.abort();
      const url = new URL(request.url()); let body = null;
      if (['/legal/pending', '/permissions/modules'].includes(url.pathname)) body = [];
      if (url.pathname === '/platform/access/context') body = { enabled: true, principal: false, allOrganizations: mode !== 'scoped', organizationIds: ['org'], capabilities: mode === 'denied' ? [] : ['ALERTS_READ', ...(mode === 'writer' ? ['ALERTS_MANAGE', 'PROVIDER_COSTS_READ'] : [])] };
      if (url.pathname === '/platform/infrastructure/resources') { calls.push({ path: url.pathname, method: request.method() }); body = [{ id: 'INFRA-01', name: 'Droplet', approvedMonthlyBudget: '20', budgetCurrency: 'USD', budgetReviewer: 'Duvan' }]; }
      if (url.pathname.startsWith('/platform/alerts')) {
        calls.push({ path: url.pathname, method: request.method(), body: request.postData() ? JSON.parse(request.postData()) : null });
        if (request.method() === 'PATCH') return request.respond({ status: 409, headers, contentType: 'application/json', body: JSON.stringify({ message: 'La alerta cambió. Recarga antes de guardar.' }) });
        if (url.pathname.endsWith('/assignees')) body = [{ id: '22222222-2222-4222-8222-222222222222', fullName: 'Operador autorizado', email: 'fixture@example.test' }];
        else if (url.pathname.endsWith(alert.id)) body = { ...alert, changes: [{ id: 'change', action: 'DETECTED', reason: 'Condición observada', createdAt: alert.observedAt }] };
        else body = { items: [alert], total: 1, page: 1, pageSize: 25, automaticCollection: false, pending: [] };
      }
      return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${origin}/platform/alerts`, { waitUntil: 'networkidle2' });
    if (mode === 'denied') {
      assert.equal(calls.length, 0); assert.equal(await page.$('a[href="/platform/alerts"]'), null);
      assert((await page.$eval('body', n => n.innerText)).includes('No tienes permiso interno'));
    } else {
      await page.waitForFunction(() => document.body.innerText.includes('SMS: umbral 90% alcanzado'));
      assert(await page.$('a[href="/platform/alerts"][aria-current="page"]'));
      await page.evaluate(() => [...document.querySelectorAll('button')].find(n => n.textContent.trim() === 'Ver seguimiento').click());
      await page.waitForFunction(() => document.body.innerText.includes('Condición observada'));
      const body = await page.$eval('body', n => n.innerText);
      assert(body.includes('Contador histórico sin reinicio confirmado'));
      assert(body.includes('90 / 100 / 10'));
      if (mode === 'writer') {
        assert(body.includes('20 USD/mes')); assert(body.includes('Duvan'));
        await page.select('form[aria-label="Gestionar alerta"] select', 'ASSIGN');
        await page.waitForFunction(() => document.body.innerText.includes('Operador autorizado'));
        const selects = await page.$$('form[aria-label="Gestionar alerta"] select');
        await selects[1].select('22222222-2222-4222-8222-222222222222');
        await page.type('form[aria-label="Gestionar alerta"] textarea', 'Seguimiento de prueba');
        await page.evaluate(() => [...document.querySelectorAll('button')].find(n => n.textContent.trim() === 'Guardar seguimiento').click());
        await page.waitForFunction(() => document.body.innerText.includes('La alerta cambió'));
        const patch = calls.find(c => c.method === 'PATCH');
        assert.equal(patch.body.version, 3); assert.equal(patch.body.action, 'ASSIGN');
        assert.equal(await page.$eval('form[aria-label="Gestionar alerta"] textarea', n => n.value), 'Seguimiento de prueba');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      } else {
        assert.equal(await page.$('form[aria-label="Gestionar alerta"]'), null);
        assert(!calls.some(c => c.path.includes('/infrastructure/')));
      }
    }
    assert.deepEqual(errors, []); console.log(`Operational alerts browser: ${mode} passed.`); await page.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
