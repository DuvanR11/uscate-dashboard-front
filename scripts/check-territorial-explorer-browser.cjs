/* eslint-disable @typescript-eslint/no-require-imports -- Local browser checks use a fully mocked API. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fixture = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const origin = process.env.TERRITORIAL_TEST_ORIGIN || 'http://localhost:3025';
const route = '/territorio/resultados-electorales';
let browser;
(async () => {
  const puppeteer = await import(pathToFileURL(path.resolve(__dirname, '../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  browser = await puppeteer.default.launch({ executablePath: process.env.TERRITORIAL_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const scenarios = ['paid', 'demo-readonly', 'legacy-v1', 'no-permission', 'impersonated', 'not-contracted', 'outside', 'pending', 'result-forbidden', 'result-withdrawn', 'network-error', 'invalid-denominator', 'invalid-catalog', 'revoked-on-refresh', 'error-on-refresh'];
  const inputSelector = 'input[placeholder="Código acta o MMV"],input[placeholder="Nombre o código"]';
  for (const mode of scenarios) {
    const session = await browser.createBrowserContext(), page = await session.newPage(), calls = [], writes = [], errors = [];
    let refreshed = false;
    page.on('pageerror', e => errors.push(e.message));
    await session.setCookie({ name: 'auth-token', value: 'fixture', url: origin }, { name: 'user-permissions', value: '1', url: origin });
    await page.setViewport({ width: mode === 'demo-readonly' ? 390 : 1440, height: 1000 });
    await page.evaluateOnNewDocument(mode => localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'fixture', user: { id: 'fixture', organizationId: 'org', fullName: 'Fixture', role: { code: 'ADMIN' }, permissions: [{ module: 'DASHBOARD', canRead: mode !== 'no-permission', canWrite: false, canDelete: false }] }, impersonation: mode === 'impersonated' ? { active: true, operatorEmail: 'fixture@example.test', targetOrganizationName: 'Fixture' } : null }, version: 0 })), mode);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().startsWith(origin)) return request.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      if (!['xhr', 'fetch'].includes(request.resourceType())) return request.abort();
      if (request.method() !== 'GET') writes.push(request.method());
      const url = new URL(request.url()); let status = 200, body = null;
      if (['/legal/pending', '/permissions/modules'].includes(url.pathname)) body = [];
      if (url.pathname === '/organization/billing') body = { hasSubscription: false };
      if (url.pathname === '/organizations/me') body = { id: 'org', name: 'Fixture', isDemo: false };
      if (url.pathname.startsWith('/organization/territorial-data/')) {
        calls.push(url.pathname);
        if (url.pathname.endsWith('/context')) {
          body = { pilot: 'NEIVA_CONCEJO_2023', eligibleTerritory: true, resultsAvailable: true, reason: 'AVAILABLE', accessMode: mode === 'demo-readonly' ? 'DEMO' : 'PAID', subscriptionAccess: mode === 'demo-readonly' ? 'READ_ONLY' : 'FULL', geography: { divipolaMunicipalityCode: '41001', revision: 1 }, publication: fixture.version, trial: mode === 'demo-readonly' ? { startsAt: '2026-10-14T20:00:00Z', trialEndsAt: '2026-10-21T20:00:00Z', readOnlyEndsAt: '2026-10-28T20:00:00Z' } : null };
          if (mode === 'not-contracted' || (mode === 'revoked-on-refresh' && refreshed)) body = { ...body, eligibleTerritory: false, resultsAvailable: false, reason: 'CONTRACT_UNVERIFIED', geography: null, publication: null };
          if (mode === 'outside') body = { ...body, eligibleTerritory: false, resultsAvailable: false, reason: 'TERRITORY_OUTSIDE_PILOT' };
          if (mode === 'pending') body = { ...body, resultsAvailable: false, reason: 'PUBLICATION_PENDING', publication: null };
          if (mode === 'network-error' || (mode === 'error-on-refresh' && refreshed)) { status = 500; body = { message: 'Fixture failure' }; }
        } else {
          body = structuredClone(fixture);
          if (mode === 'result-forbidden') { status = 403; body = {}; }
          if (mode === 'result-withdrawn') { status = 404; body = {}; }
          if (mode === 'invalid-denominator') body.data.groupPercentageDenominator.votes = 142688;
          if (mode === 'invalid-catalog') body.data.groupNameCatalog = { ...body.data.groupNameCatalog, contentHash:'e'.repeat(64) };
          if (mode === 'legacy-v1') { body.data.methodologyVersion='NEIVA_E26_MUNICIPAL_V1';delete body.data.groupNameCatalog;body.data.groups.forEach(g=>{delete g.name;delete g.nameEvidence;});body.data.limits=body.data.limits.filter(l=>!['E24_SOME_LABELS_TRUNCATED','ELECTION_AND_TERRITORY_SCOPED_NOT_NATIONAL_LEGAL_NAMES'].includes(l));body.data.limits.push('GROUP_NAMES_NOT_VALIDATED'); }
        }
      }
      return request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(origin + route, { waitUntil: 'networkidle2', timeout: 90000 });
    const ready = ['paid', 'demo-readonly', 'legacy-v1', 'revoked-on-refresh', 'error-on-refresh'].includes(mode);
    if (ready) {
      await page.waitForSelector('table');
      assert.equal(await page.$$eval('tbody tr', rows => rows.length), 17);
      let text = await page.$eval('body', body => body.innerText);
      for (const textPart of ['155.596', '166.049', '142.688', 'desconocido', 'Edades de votantes: sin datos', 'Fuentes y metodología']) assert.ok(text.includes(textPart), textPart);
      const first = [...fixture.data.groups].sort((a, b) => b.votes - a.votes)[0];
      const share = (first.votes * 100 / 155596).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
      assert.equal(await page.$eval('tbody tr td:last-child', n => n.textContent), share);
      if (mode === 'paid') {
        await page.type(inputSelector, first.mmvCode);
        assert.equal(await page.$$eval('tbody tr', rows => rows.length), 1);
        assert.equal(await page.$eval('tbody tr td:last-child', n => n.textContent), share);
        if (fixture.data.groupNameCatalog) {
          assert.ok(text.includes('PARTIDO LIBERAL COLOMBIANO'));
          await page.$eval(inputSelector,input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'neiva en accion');input.dispatchEvent(new Event('input',{bubbles:true}));});
          await page.waitForFunction(()=>document.querySelector('tbody')?.innerText.includes('NEIVA EN ACCIÓN'));
          assert.equal(await page.$$eval('tbody tr',rows=>rows.length),1);assert.equal(await page.$eval('tbody tr td:last-child',n=>n.textContent),'9,45 %');
        }
        await page.$eval(inputSelector, input => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'no-match'); input.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.waitForFunction(() => document.body.innerText.includes('No hay agrupaciones con ese código.'));
      }
      if (mode === 'demo-readonly') assert.ok(text.includes('Período de solo lectura.'));
      if (mode.endsWith('on-refresh')) {
        refreshed = true;
        await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Actualizar consulta')).click());
        await page.waitForFunction(mode => !document.querySelector('table') && !document.body.innerText.includes('155.596') && document.body.innerText.includes(mode === 'revoked-on-refresh' ? 'El acceso territorial aún no está acreditado.' : 'No pudimos comprobar la versión vigente.'), {}, mode);
      }
    } else {
      assert.equal(await page.$('table'), null);
      if (['no-permission', 'impersonated'].includes(mode)) assert.equal(calls.length, 0);
      if (['not-contracted', 'outside', 'pending', 'network-error'].includes(mode)) assert.equal(calls.some(c => c.endsWith('/results')), false);
      const text = await page.$eval('body', body => body.innerText);
      assert.equal(text.includes('155.596'), false);
    }
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (mode === 'demo-readonly') await page.screenshot({ path: path.resolve(__dirname, '../../.tmp/t3-explorer/mobile.png'), fullPage: true });
    await session.close();
  }
  console.log(JSON.stringify({ result: 'TERRITORIAL_EXPLORER_BROWSER_VERIFIED', scenarios: scenarios.length, desktopAndMobile: true, percentagesAndFilter: true, deniedAndReadOnlyStates: true, staleResultsCleared: true, allApiMocked: true, noMutations: true }));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
