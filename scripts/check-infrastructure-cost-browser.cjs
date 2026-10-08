/* eslint-disable @typescript-eslint/no-require-imports -- Local browser verification with mocked API only. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const origin = process.env.INFRA_TEST_ORIGIN || 'http://127.0.0.1:3012';
const resource = { id: 'INFRA-01', name: 'Servidor Droplet', supplier: 'DigitalOcean', billingOwner: 'Titular de prueba', technicalReference: 'fixture', declaredPlanAmount: '20', declaredPlanCurrency: 'USD', declaredPaymentCurrency: 'COP', declarationSource: 'Declarado: periodicidad pendiente' };
const cost = { id: '11111111-1111-4111-8111-111111111111', resourceId: resource.id, resource, periodStart: '2026-10-01T00:00:00Z', periodEnd: '2026-11-01T00:00:00Z', amount: '20', currency: 'USD', status: 'DECLARED', paidAmount: null, paidCurrency: null, paymentReference: null, invoiceReference: null, evidenceReference: null, notes: '', version: 3 };
let browser;
async function main() {
  const puppeteer = await import(pathToFileURL(path.resolve(__dirname, '../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  browser = await puppeteer.default.launch({ executablePath: process.env.INFRA_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  await browser.defaultBrowserContext().setCookie({ name: 'auth-token', value: 'fixture', url: origin }, { name: 'user-permissions', value: '1', url: origin });
  for (const mode of ['reader', 'writer', 'scoped', 'denied']) {
    const page = await browser.newPage(); const calls = [], errors = [];
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
      if (url.pathname === '/platform/access/context') body = { enabled: true, principal: false, allOrganizations: mode !== 'scoped', organizationIds: [], capabilities: mode === 'denied' ? [] : ['PROVIDER_COSTS_READ', ...(mode === 'writer' ? ['PROVIDER_COSTS_MANAGE'] : [])] };
      if (url.pathname.startsWith('/platform/infrastructure/')) {
        calls.push({ path: url.pathname, method: request.method(), body: request.postData() ? JSON.parse(request.postData()) : null });
        if (url.pathname.endsWith('/resources')) body = [resource];
        else if (request.method() === 'PATCH' || request.method() === 'POST') return request.respond({ status: 409, headers, contentType: 'application/json', body: JSON.stringify({ message: 'El costo cambió. Recarga su detalle antes de corregir.' }) });
        else if (url.pathname.endsWith(cost.id)) body = { ...cost, changes: [{ id: 'change', operatorEmail: 'fixture@example.test', reason: 'Declaración original', before: null, after: { amount: '20' }, createdAt: '2026-10-08T02:00:00Z' }] };
        else body = { items: [cost], total: 1, page: 1, pageSize: 25, totals: [{ currency: 'USD', status: 'DECLARED', amount: '20', records: 1 }], payments: [] };
      }
      return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${origin}/platform/consumption`, { waitUntil: 'networkidle2' });
    if (['scoped', 'denied'].includes(mode)) {
      assert.equal(calls.length, 0); assert.equal(await page.$('a[href="/platform/consumption"]'), null);
      assert(!(await page.$eval('body', (n) => n.innerText)).includes('Titular de prueba'));
    } else {
      await page.waitForFunction(() => document.body.innerText.includes('Sin pagos registrados')).catch(async (error) => { console.error('Fixture diagnostics:', { mode, calls, errors, text: await page.$eval('body', (n) => n.innerText) }); throw error; });
      assert(await page.$('a[href="/platform/consumption"]')); // costs-only staff can enter without usage permission
      const button = (label) => page.evaluate((label) => [...document.querySelectorAll('button')].find((n) => n.textContent.trim() === label)?.click(), label);
      if (mode === 'reader') {
        assert.equal(await page.$('form[aria-label="Registro de costo de infraestructura"]'), null);
        await button('Ver detalle'); await page.waitForFunction(() => document.body.innerText.includes('Declaración original'));
        assert.equal(await page.$('form[aria-label="Registro de costo de infraestructura"]'), null);
      } else {
        await button('Detalle y corregir'); await page.waitForSelector('form[aria-label="Registro de costo de infraestructura"]');
        await page.evaluate(() => {
          const reason = document.querySelector('form[aria-label="Registro de costo de infraestructura"] textarea[maxlength="500"]');
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(reason, 'Corrección de prueba');
          reason.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await button('Guardar costo'); await page.waitForFunction(() => document.body.innerText.includes('El costo cambió. Recarga'));
        const patch = calls.find((c) => c.method === 'PATCH'); assert(patch); assert.equal(patch.body.version, 3); assert.equal(patch.body.amount, '20');
        assert.equal(patch.body.periodStart, '2026-10-01'); assert.equal(patch.body.reason, 'Corrección de prueba');
        assert(!Object.hasOwn(patch.body, 'paidAmount')); // missing paid amount is not invented as zero
        assert.equal(await page.$eval('form[aria-label="Registro de costo de infraestructura"] textarea[maxlength="500"]', (n) => n.value), 'Corrección de prueba');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        assert.equal(overflow, false);
      }
      assert(calls.every((c) => !c.path.startsWith('/platform/provider-usage')));
    }
    assert.deepEqual(errors, []); console.log(`Infrastructure browser: ${mode} passed.`); await page.close();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
