/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS verification script. */
// Run against a local next start. All API calls are intercepted; no real tokens or providers.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const origin = process.env.USAGE_TEST_ORIGIN || 'http://127.0.0.1:3011';
const organizationId = '11111111-1111-4111-8111-111111111111';
const fixture = {
  total: 26, page: 1, pageSize: 25, coverage: 'LIVE_PARTIAL', historicalBackfill: false,
  unresolved: 2, missingMeasurements: 1, missingValuations: 1,
  units: [{ unit: 'INPUT_TOKENS', quality: 'PROVIDER_REPORTED', quantity: '0', observed: 1, pending: 0 }, { unit: 'SMS_SEGMENTS', quality: 'PENDING', quantity: null, observed: 0, pending: 1 }],
  costs: [{ currency: 'USD', status: 'CONFIRMED', amount: '0', attempts: 1 }, { currency: null, status: 'PENDING', amount: null, attempts: 1 }],
  items: [{ id: 'attempt-fixture', provider: 'OPENAI', service: 'AI_CHAT', accountRef: 'fixture-account', model: 'fixture-model', result: 'UNKNOWN', externalId: null, startedAt: '2026-10-07T20:00:00Z', finishedAt: null,
    operation: { id: 'operation-fixture', organizationId, scope: 'ORGANIZATION', module: 'TEST', action: 'fixture' }, measurements: [],
    valuations: [{ amount: '0', reportedAmount: '0', currency: 'USD', status: 'CONFIRMED', source: 'fixture', reconciliationStatus: 'PENDING' }] }],
};
let browser;
async function run() {
  const puppeteer = await import(pathToFileURL(path.resolve(__dirname, '../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  browser = await puppeteer.default.launch({ executablePath: process.env.USAGE_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  await browser.defaultBrowserContext().setCookie({ name: 'auth-token', value: 'fixture', url: origin }, { name: 'user-permissions', value: '1', url: origin });
  for (const mode of ['finance', 'scoped', 'denied']) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('Fixture browser error:', error.message));
    const requests = []; let fail = false;
    await page.setViewport({ width: mode === 'scoped' ? 390 : 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'fixture', user: { id: 'fixture', fullName: 'Test', role: { code: 'PLATFORM_OPERATOR' }, permissions: [{ module: 'PLATAFORMA', canRead: true, canWrite: false }] } }, version: 0 })));
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().startsWith(origin)) return request.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      if (!['fetch', 'xhr'].includes(request.resourceType())) return request.abort();
      const url = new URL(request.url()); let body = null;
      if (['/legal/pending', '/permissions/modules'].includes(url.pathname)) body = [];
      if (url.pathname === '/platform/access/context') body = { enabled: true, principal: false, allOrganizations: mode === 'finance', organizationIds: [organizationId], capabilities: mode === 'denied' ? [] : mode === 'finance' ? ['PROVIDER_USAGE_READ', 'PROVIDER_COSTS_READ'] : ['PROVIDER_USAGE_READ'] };
      if (url.pathname.startsWith('/platform/provider-usage')) {
        requests.push(url);
        if (fail) { fail = false; return request.respond({ status: 403, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Acceso revocado de prueba' }) }); }
        body = { ...fixture, from: url.searchParams.get('from'), to: url.searchParams.get('to'), page: Number(url.searchParams.get('page')) };
        if (mode !== 'finance') { delete body.costs; delete body.missingValuations; body.items = fixture.items.map(({ valuations, ...item }) => item); }
      }
      return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const button = async (text) => page.evaluate((text) => [...document.querySelectorAll('button')].find((n) => n.textContent.trim() === text).click(), text);
    const text = () => page.$eval('body', (n) => n.innerText);
    await page.goto(`${origin}/platform/consumption`, { waitUntil: 'networkidle2' });
    if (mode === 'denied') {
      assert((await text()).includes('No tienes permiso interno')); assert.equal(requests.length, 0);
      assert.equal(await page.$('a[href="/platform/consumption"]'), null);
    } else {
      await page.waitForFunction(() => document.body.innerText.includes('Historial de intentos'));
      assert((await text()).includes('Pendiente')); assert((await text()).includes('Incierto'));
      assert(requests.every((r) => r.pathname === `/platform/provider-usage${mode === 'finance' ? '/costs' : ''}`));
      if (mode === 'scoped') {
        assert((await text()).includes('requiere el permiso interno'));
        assert.equal(await page.$('option[value="SHARED"]'), null);
        assert.equal(await page.$('option[value="PLATFORM"]'), null);
        assert.equal(await page.$('option[value="UNATTRIBUTED"]'), null);
        assert.equal(await page.$('input[placeholder="UUID o todas"]'), null);
      } else assert((await text()).includes('Moneda sin verificar'));
      await button('Siguiente'); await page.waitForFunction(() => document.body.innerText.includes('Página 2 de 2'));
      assert.equal(requests.at(-1).searchParams.get('page'), '2');
      await page.evaluate(() => document.querySelector('summary').click());
      assert((await text()).includes('fixture-account'));
      fail = true; await button('Actualizar resultados');
      await page.waitForFunction(() => document.body.innerText.includes('Acceso revocado de prueba'));
      assert(!(await text()).includes('fixture-account')); // old financial data must disappear on denial
      await button('Reintentar'); await page.waitForFunction(() => document.body.innerText.includes('Historial de intentos'));
      const count = requests.length;
      await page.evaluate(() => {
        const input = document.querySelector('input[type=date]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2020-01-01');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await button('Aplicar filtros'); await page.waitForFunction(() => document.body.innerText.includes('máximo de 90 días incluidos'));
      assert.equal(requests.length, count);
    }
    await page.close();
    console.log(`Provider usage browser: ${mode} passed.`);
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
