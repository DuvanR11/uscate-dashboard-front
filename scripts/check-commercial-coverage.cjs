/* eslint-disable @typescript-eslint/no-require-imports -- Isolated response and browser verification. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  { pathToFileURL } = require("node:url");
const f = require("./fixtures/commercial-coverage.cjs"),
  target = { exports: {} };
const code = ts.transpileModule(
  fs.readFileSync(
    path.join(__dirname, "../src/lib/api/territorial-commercial.ts"),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
new Function("module", "exports", "require", code)(
  target,
  target.exports,
  () => ({}),
);
const {
  validateCommercialCoverage,
  validateCommercialOrganizations,
  coverageReportCsv,
} = target.exports;
let checks = 0;
assert.doesNotThrow(() => validateCommercialCoverage(f.page()));
checks++;
for (const mutate of [
  (p) => (p.checkedAt = "bad"),
  (p) => p.items.push(p.items[0]),
  (p) => (p.next = "UNVERIFIED_NEXT"),
  (p) => (p.items[0].sources.reviewed = -1),
  (p) => (p.items[0].sources.reviewed = 4),
  (p) => (p.items[0].publication = null),
  (p) => (p.items[0].territory.code = "05001"),
  (p) => (p.items[0].status = "UNKNOWN"),
  (p) => (p.items[0].monitoring.openAlerts = -1),
  (p) => (p.items[0].monitoring.nextRunAt = "bad"),
  (p) => (p.items[1].publication = p.items[0].publication),
  (p) => (p.items[1].blockers = []),
]) {
  const p = f.page();
  mutate(p);
  assert.throws(() => validateCommercialCoverage(p));
  checks++;
}
assert.doesNotThrow(() => validateCommercialOrganizations(f.organizations()));
checks++;
for (const mutate of [
  (p) => p.items.push(p.items[0]),
  (p) => (p.items[0].access.status = "EXPIRED"),
  (p) => (p.items[0].access.endsAt = "bad"),
  (p) => (p.items[0].availability = "UNKNOWN"),
  (p) => (p.items[0].origins = ["other"]),
  (p) => (p.next = "unknown"),
]) {
  const p = f.organizations();
  mutate(p);
  assert.throws(() => validateCommercialOrganizations(p));
  checks++;
}
for (const name of [
  '=HYPERLINK("x")',
  "+1",
  "-2",
  "@SUM(1)",
  "\t=1+1",
  "\r\n=2+2",
]) {
  const p = f.page();
  p.items[0].territory.name = name;
  const csv = coverageReportCsv(p);
  assert.ok(csv.includes("\"'" + name.replaceAll('"', '""') + '"'));
  checks++;
}
if (process.env.COVERAGE_BROWSER_TEST !== "true") {
  console.log(
    JSON.stringify({ result: "COMMERCIAL_COVERAGE_RESPONSE_VERIFIED", checks }),
  );
  process.exit(0);
}
const origin = "http://127.0.0.1:3057",
  backend = process.env.COVERAGE_BROWSER_BACKEND,
  output = process.env.COVERAGE_BROWSER_OUTPUT;
assert.ok(backend && output);
fs.mkdirSync(output, { recursive: true });
let browser;
(async () => {
  const { default: puppeteer } = await import(
    pathToFileURL(
      path.join(backend, "node_modules/puppeteer/lib/puppeteer/puppeteer.js"),
    ).href
  );
  browser = await puppeteer.launch({ headless: true });
  const scenarios = [];
  for (const mode of process.env.COVERAGE_SCREENSHOTS_ONLY === "true"
    ? ["desktop", "mobile"]
    : [
        "desktop",
        "mobile",
        "empty",
        "retry",
        "invalid",
        "search",
        "pagination",
        "scoped",
        "no-billing",
      ]) {
    const session = await browser.createBrowserContext(),
      page = await session.newPage(),
      errors = [],
      calls = [],
      writes = [];
    let attempts = 0,
      retryReleased = false;
    await session.setCookie(
      { name: "auth-token", value: "synthetic-only", url: origin },
      { name: "user-permissions", value: "1", url: origin },
    );
    await page.evaluateOnNewDocument(() =>
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            token: "synthetic-only",
            user: {
              id: "qa",
              email: "qa@example.test",
              fullName: "QA operator",
              role: { code: "PLATFORM_OPERATOR" },
              permissions: [
                {
                  module: "PLATAFORMA",
                  canRead: true,
                  canWrite: true,
                  canDelete: false,
                },
              ],
            },
            impersonation: null,
          },
          version: 0,
        }),
      ),
    );
    await page.setViewport({
      width: mode === "mobile" ? 390 : 1440,
      height: 1000,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      try {
        const u = new URL(req.url());
        if (u.origin === origin || ["data:", "blob:"].includes(u.protocol))
          return req.continue();
        const headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "cache-control": "no-store",
        };
        if (req.method() === "OPTIONS")
          return req.respond({ status: 204, headers });
        if (!["fetch", "xhr"].includes(req.resourceType())) return req.abort();
        if (req.method() !== "GET") {
          writes.push(u.pathname);
          return req.abort();
        }
        const respond = (body, status = 200) =>
          req.respond({
            status,
            headers,
            contentType: "application/json",
            body: JSON.stringify(body),
          });
        if (u.pathname === "/platform/access/context")
          return respond({
            enabled: true,
            allOrganizations: mode !== "scoped",
            principal: false,
            organizationIds: [],
            capabilities:
              mode === "no-billing"
                ? ["CATALOG_MANAGE", "ORGANIZATIONS_READ"]
                : ["CATALOG_MANAGE", "ORGANIZATIONS_READ", "BILLING_READ"],
          });
        if (
          u.pathname.startsWith(
            "/platform/territorial-data/commercial-coverage",
          )
        ) {
          calls.push(u.pathname + u.search);
          if (u.pathname.endsWith("/organizations"))
            return respond(f.organizations());
          attempts++;
          if (mode === "retry" && !retryReleased)
            return respond({ message: "Fallo de consulta de prueba" }, 503);
          const data = f.page();
          if (mode === "empty") data.items = [];
          if (mode === "invalid") data.items[0].publication = null;
          if (mode === "search" && u.searchParams.get("search"))
            data.items = [data.items[0]];
          if (mode === "pagination") {
            if (u.searchParams.get("afterCode"))
              data.items = [f.item("ZZ_LAST", false)];
            else {
              data.items = Array.from({ length: 20 }, (_, i) =>
                f.item("QA_" + String(i).padStart(3, "0"), false),
              );
              data.next = "QA_019";
            }
          }
          return respond(data);
        }
        return respond(
          u.pathname === "/branding"
            ? {
                applicationName: "Zyron",
                primaryColor: "#1E4FD8",
                secondaryColor: "#22B8CF",
                accentColor: "#22B8CF",
              }
            : [],
        );
      } catch (error) {
        errors.push(error.message);
        await req.abort();
      }
    });
    await page.goto(origin + "/platform/territorial-coverage", {
      waitUntil: "networkidle0",
      timeout: 90000,
    });
    const text = () => page.evaluate(() => document.body.innerText);
    const click = async (label) => {
      const handles = await page.$$("button");
      for (const h of handles)
        if ((await h.evaluate((el) => el.textContent)).includes(label)) {
          await h.click();
          return;
        }
      throw Error("Button not found: " + label);
    };
    if (["scoped", "no-billing"].includes(mode)) {
      assert.ok(
        (await text()).includes("Esta consulta requiere alcance global"),
      );
      assert.equal(calls.length, 0);
    } else if (mode === "empty") {
      assert.ok((await text()).includes("No hay conjuntos que coincidan"));
    } else if (mode === "invalid") {
      assert.ok((await text()).includes("No se pudo cargar esta sección"));
      assert.ok(!(await text()).includes("Publicación municipal verificada."));
    } else {
      if (mode === "retry") {
        await page.waitForFunction(() =>
          Array.from(document.querySelectorAll("button")).some((b) =>
            b.textContent.includes("Reintentar"),
          ),
        );
        retryReleased = true;
        await click("Reintentar");
        await page.waitForFunction(() =>
          document.body.innerText.includes("Disponible municipal"),
        );
      }
      assert.ok(
        (await text()).includes(
          mode === "pagination" ? "En preparación" : "Disponible municipal",
        ),
        mode + ": " + (await text()).slice(-1400),
      );
      if (mode === "search") {
        await page.type('input[placeholder^="Neiva"]', "Neiva");
        await click("Buscar");
        await page.waitForSelector(
          'article[aria-label="Cobertura NEIVA_CONCEJO_2023"]',
        );
        assert.ok(calls.some((c) => c.includes("search=Neiva")));
      }
      if (mode === "pagination") {
        await click("Página siguiente");
        await page.waitForFunction(() =>
          document.body.innerText.includes("ZZ_LAST"),
        );
        assert.ok(calls.some((c) => c.includes("afterCode=QA_019")));
      }
      if (["desktop", "mobile"].includes(mode)) {
        await click("Ver organizaciones y accesos");
        await page.waitForFunction(() =>
          document.body.innerText.includes("Organizacion de prueba"),
        );
        assert.ok((await text()).includes("Solo lectura"));
        const downloadDir = path.join(output, "downloads-" + mode);
        fs.mkdirSync(downloadDir, { recursive: true });
        const cdp = await page.createCDPSession();
        await cdp.send("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: downloadDir,
        });
        await click("Informe de esta página");
        for (
          let i = 0;
          i < 50 &&
          !fs.readdirSync(downloadDir).some((n) => n.endsWith(".csv"));
          i++
        )
          await new Promise((r) => setTimeout(r, 100));
        const csvFile = fs
          .readdirSync(downloadDir)
          .find((n) => n.endsWith(".csv"));
        assert.ok(csvFile);
        assert.ok(
          fs
            .readFileSync(path.join(downloadDir, csvFile), "utf8")
            .includes("SOLO ESTA PÁGINA"),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise((r) => setTimeout(r, 200));
        await page.screenshot({
          path: path.join(output, mode + ".png"),
          fullPage: true,
        });
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    scenarios.push({ mode, passed: true, calls: calls.length, noWrites: true });
    await session.close();
  }
  fs.writeFileSync(
    path.join(output, "evidence.json"),
    JSON.stringify(
      {
        result: "COMMERCIAL_COVERAGE_BROWSER_VERIFIED",
        checkedAt: new Date().toISOString(),
        responseChecks: checks,
        scenarios,
        interceptedApi: true,
        noProductionRequests: true,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ checks, scenarios }));
})()
  .catch((error) => {
    console.error(error.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) {
      const timer = setTimeout(() => browser.process()?.kill("SIGKILL"), 5000);
      try {
        await browser.close();
      } finally {
        clearTimeout(timer);
      }
    }
  });
