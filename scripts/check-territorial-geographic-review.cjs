/* eslint-disable @typescript-eslint/no-require-imports -- Local mocked API browser verification. */
const {scheduleFixture}=require('./fixtures/territorial-health-schedule.cjs');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url'), { randomUUID } = require('node:crypto');
const { workflowFixture } = require('./fixtures/territorial-geographic-review.cjs');
const { healthFixture } = require('./fixtures/territorial-health.cjs');
const validation = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-cierre-2026-10-15.json'), 'utf8'));
const draft = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../api-uscate-back/src/modules/platform/data/neiva-crosswalk-draft.json'), 'utf8'));
draft.contentHash = validation.draftContentHash;
const origin = process.env.TERRITORIAL_TEST_ORIGIN || 'http://localhost:3029';
const section = 'section[aria-label="Revisión interna de geografía"]';
const operator = workflowFixture(validation).operators[0];
let browser;
(async () => {
  const puppeteer = await import(pathToFileURL(path.resolve(__dirname, '../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  browser = await puppeteer.default.launch({ executablePath: process.env.TERRITORIAL_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  for (const mode of (process.env.TERRITORIAL_REVIEW_MODES?.split(',') || ['desktop', 'mobile', 'read-only', 'other-reviewer', 'forbidden', 'retry', 'conflict', 'uncertain-response'])) {
    const context = await browser.createBrowserContext(), page = await context.newPage();
    let state = workflowFixture(validation), failed = false, reads = 0;
    const writes = [], errors = [];
    await context.setCookie({ name: 'auth-token', value: 'fixture', url: origin }, { name: 'user-permissions', value: '1', url: origin });
    await page.evaluateOnNewDocument((id, canWrite) => localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'fixture', user: { id, organizationId: 'platform', fullName: 'Prueba', role: { code: 'PLATFORM_OPERATOR' }, permissions: [{ module: 'PLATAFORMA', canRead: true, canWrite, canDelete: false }] }, impersonation: null }, version: 0 })), mode === 'other-reviewer' ? randomUUID() : operator.id, mode !== 'read-only');
    await page.setViewport({ width: mode === 'mobile' ? 390 : 1440, height: 1000 });
    page.on('pageerror', e => errors.push(e.message));
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().startsWith(origin)) return request.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      if (!['xhr', 'fetch'].includes(request.resourceType())) return request.abort();
      const url = new URL(request.url()); let body = null, status = 200;
      if (['/legal/pending', '/permissions/modules', '/platform/territorial-data'].includes(url.pathname)) body = [];
      if (url.pathname === '/organizations/me') body = { id: 'platform', name: 'Prueba' };
      if (url.pathname === '/organization/billing') body = { hasSubscription: false };
      if (url.pathname === '/platform/territorial-data/health') body = healthFixture();
      if (url.pathname === '/platform/territorial-data/health/schedule') body = scheduleFixture();
      if (url.pathname === '/platform/access/context') body = { enabled: true, principal: false, capabilities: ['CATALOG_MANAGE'], organizationIds: [], allOrganizations: true };
      if (url.pathname.endsWith('/geography/config')) body = { identity: {}, current: null, history: [], municipalities: [] };
      if (url.pathname.endsWith('/geography/crosswalk')) body = draft;
      if (url.pathname.endsWith('/crosswalk/validation')) body = validation;
      if (url.pathname.endsWith('/geography/review-workflow')) {
        if (request.method() === 'GET') {
          reads++; body = state;
          if (mode === 'forbidden') { status = 403; body = { message: 'Sin acceso al catálogo.' }; }
          if (mode === 'retry' && !failed) { failed = true; status = 503; body = { message: 'No disponible.' }; }
        } else {
          const command = JSON.parse(request.postData()); writes.push(command);
          if (mode === 'conflict') { status = 409; body = { message: 'Otro operador modificó la revisión. Recarga antes de decidir.' }; }
          else if (mode === 'uncertain-response' && !failed) { failed = true; return request.abort('failed'); }
          else {
            const target = state.targets.find(t => t.key === command.targetKey);
            state.revision++;
            const event = { id: randomUUID(), revision: state.revision, targetKey: target.key, action: command.action, reportHash: state.reportHash, actorEmail: operator.email, reason: command.reason, createdAt: new Date().toISOString(), payload: {} };
            if (command.action === 'ASSIGN') { target.assignee = operator; target.status = 'PENDING'; event.payload.assignee = operator; }
            if (command.action === 'ATTACH_EVIDENCE') { target.evidence.push({ ...command.evidence, id: event.id, revision: event.revision, current: true, withdrawn: false }); event.payload.evidence = command.evidence; target.status = 'PENDING'; }
            if (command.action === 'ACCEPT_REVIEW') { target.status = 'REVIEWED'; target.decision = event; event.payload.evidenceIds = command.evidenceIds; }
            if (command.action === 'REVOKE') { target.status = 'REVOKED'; target.decision = event; }
            state.reviewedCount = state.targets.filter(t => t.status === 'REVIEWED').length;
            state.history.unshift(event);
            body = { receipt: { eventId: event.id, revision: state.revision, replayed: false }, state };
          }
        }
      }
      return request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(origin + '/platform/territorial-data', { waitUntil: 'networkidle2', timeout: 90000 });
    if (mode === 'read-only') { assert.equal(await page.$(section), null); assert.equal(reads, 0); assert.equal(writes.length, 0); }
    else if (mode === 'forbidden') { await page.waitForSelector(section + ' [role="alert"]'); assert.equal(await page.$(section + ' form'), null); }
    else {
      if (mode === 'retry') { await page.waitForSelector(section + ' [role="alert"]'); await page.click(section + ' button'); }
      await page.waitForSelector(section + ' select[aria-label="Caso o requisito"]');
      assert.equal(await page.$$eval(section + ' select[aria-label="Caso o requisito"] option', opts => opts.length), 10);
      if (mode === 'read-only') assert.equal(await page.$(section + ' form'), null);
      else {
        const actionSelect = section + ' select[aria-label="Acción de revisión"]', reason = section + ' textarea[aria-label="Motivo de revisión"]', submit = section + ' button[type="submit"]';
        await page.select(section + ' select[aria-label="Responsable de revisión"]', operator.id);
        await page.type(reason, 'Verificación local del responsable asignado.');
        await page.click(submit);
        if (mode === 'conflict') {
          await page.waitForSelector(section + ' [role="alert"]'); assert.ok((await page.$eval(section, e => e.innerText)).includes('Otro operador'));
          await page.click(section + ' button'); await page.waitForFunction(() => !document.querySelector('section[aria-label="Revisión interna de geografía"] [role="alert"]'));
          assert.ok(reads >= 2);
        } else {
          if (mode === 'uncertain-response') { await page.waitForSelector(section + ' [role="alert"]'); await page.click(submit); }
          await page.waitForSelector(section + ' [role="status"]');
          if (mode === 'uncertain-response') { assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]); }
          if (mode === 'other-reviewer') {
            await page.select(actionSelect, 'REQUEST_CHANGES'); await page.type(reason, 'Intento con responsable diferente al usuario.');
            assert.equal(await page.$eval(submit, button => button.disabled), true);
          } else if (['desktop', 'mobile'].includes(mode)) {
            await page.select(actionSelect, 'ATTACH_EVIDENCE');
            const fields = { 'Título del documento': 'Documento de prueba', 'URL pública del documento': 'https://www.registraduria.gov.co/prueba.pdf', 'SHA-256 del archivo original': 'a'.repeat(64), 'Entidad emisora': 'Entidad de prueba' };
            for (const [label, text] of Object.entries(fields)) await page.type(section + ` input[aria-label="${label}"]`, text);
            await page.$eval(section + ' input[type="date"]', input => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '2023-10-29'); input.dispatchEvent(new Event('input', { bubbles: true })); });
            for (const area of await page.$$(section + ' form textarea:not([aria-label])')) await area.type('Documento de ejemplo, no acredita coordenadas ni geometrías.');
            await page.type(reason, 'Registrar una referencia de ensayo para el caso.'); await page.click(submit);
            await page.waitForSelector(section + ' ul[aria-label="Evidencias del caso"] li');
            await page.select(actionSelect, 'ACCEPT_REVIEW');
            await page.type(reason, 'Revisión documental de ensayo sin publicar geometrías.');
            assert.equal(await page.$eval(submit, button => button.disabled), true);
            for (const checkbox of await page.$$(section + ' form input[type="checkbox"]')) { await checkbox.evaluate(input => input.scrollIntoView({ block: 'center' })); await checkbox.click(); assert.equal(await checkbox.evaluate(input => input.checked), true); }
            await page.click(submit);
            try { await page.waitForFunction(s => document.querySelector(s).innerText.includes('1 de 10 revisiones documentales aceptadas'), {}, section); }
            catch (error) { console.error(JSON.stringify({ mode, writes, form: await page.$eval(section + ' form', form => ({ text: form.innerText, validity: form.checkValidity(), checkboxes: Array.from(form.querySelectorAll('input[type="checkbox"]'), c => ({ checked: c.checked, width: c.getBoundingClientRect().width })) })) })); throw error; }
            await page.select(actionSelect, 'REVOKE'); await page.type(reason, 'Revocar la aceptación documental de ensayo.'); await page.click(submit);
            await page.waitForFunction(s => document.querySelector(s).innerText.includes('0 de 10 revisiones documentales aceptadas'), {}, section);
            assert.equal(writes.length, 4); assert.equal(new Set(writes.map(w => w.requestKey)).size, 4);
            assert.ok(writes.every(w => w.reportHash === validation.contentHash));
            await page.click(section + ' details summary');
            assert.equal(await page.$$eval(section + ' details:first-of-type ol > li', rows => rows.length), 4);
            assert.equal(await page.$eval(section, e => e.scrollWidth <= e.clientWidth + 1), true);
            const output = path.resolve(__dirname, '../../.tmp/t4-geographic-review'); fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: path.join(output, mode + '.png'), fullPage: true });
          }
        }
      }
    }
    assert.deepEqual(errors, []); console.log(JSON.stringify({ mode, passed: true, writes: writes.length, reads })); await context.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
