/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS verification script. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/api/territorial-results.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = { exports: {} };
new Function('module', 'exports', 'require', compiled)(target, target.exports, () => ({}));
const { votePercentage, validateMunicipalResults } = target.exports;
const result = {
  version: { id: 'published', number: 1, publishedAt: '2026-10-14T19:53:07Z', contentHash: 'a'.repeat(64) },
  data: {
    pilot: 'NEIVA_CONCEJO_2023', granularity: 'MUNICIPAL', territoryCode: '41001', geographyRevision: 1,
    corporation: 'CONCEJO', methodologyVersion: 'NEIVA_E26_MUNICIPAL_V1', electionDate: '2023-10-29',
    municipality: 'Neiva', department: 'Huila',
    totals: { GROUP: 100, BLANK: 20, VALID: 120, NULL: 3, UNMARKED: 2 }, categoryTotal: 125,
    groupPercentageDenominator: { category: 'VALID_INCLUDING_BLANK', votes: 120 },
    groups: [{ documentCode: '001', mmvCode: '00001', votes: 40 }, { documentCode: '002', mmvCode: '00002', votes: 60 }],
    coverage: { observedTables: 1, expectedTables: 1 }, participation: null, votersByAge: null, limits: [],
    sources: { actas: { provenance: 'USER_PROVIDED_PDFS_AFTER_OFFICIAL_PORTAL_LINK', cryptographicSignatureVerified: false, e26Reference: 'E26', e24Reference: 'E24', declaredPortal: 'https://escrutinios-2023.registraduria.gov.co/published', statedScrutinyCompletion: '2023-11-06T19:46:00-05:00', e24GenerationTime: '2023-11-07T20:12:00-05:00' }, mmv: { url: 'https://observatorio.registraduria.gov.co/comprimidos/MMV_TERRITORIALES2023_HUILA.zip', resultType: 'UNVERIFIED', cutoff: null } },
  },
};
const context = { eligibleTerritory: true, resultsAvailable: true, geography: { divipolaMunicipalityCode: '41001', revision: 1 }, publication: { id: 'published', number: 1 } };
let checks = 0;
assert.doesNotThrow(() => validateMunicipalResults(result, context)); checks++;
assert.equal(votePercentage(60, 120), 50); checks++;
assert.equal(votePercentage(0, 120), 0); checks++;
assert.equal(votePercentage(0, 0), null); checks++;
assert.equal(votePercentage(40, 120), 100 / 3); checks++;
assert.ok(Math.abs(votePercentage(40, 120) + votePercentage(60, 120) - 100 * 100 / 120) < 1e-12); checks++;
for (const mutate of [
  r => { r.data.totals.VALID = 100; },
  r => { r.data.groupPercentageDenominator.votes = 100; },
  r => { r.data.groups[0].votes = -1; },
  r => { r.data.groups[0].votes = 41; },
  r => { r.data.groups[1].mmvCode = '00001'; },
  r => { r.data.groups[0].documentCode = 1; },
  r => { r.data.categoryTotal = 126; },
  r => { r.version.id = 'superseded'; },
  r => { r.data.geographyRevision = 2; },
  r => { r.data.territoryCode = '11001'; },
  r => { r.data.sources.mmv.cutoff = '2023-11-06T19:46:00-05:00'; },
  r => { r.data.votersByAge = [{ age: 18, votes: 10 }]; },
  r => { r.data.coverage.observedTables = 2; },
  r => { r.data.sources.actas.e26Reference = {}; },
]) {
  const invalid = structuredClone(result); mutate(invalid);
  assert.throws(() => validateMunicipalResults(invalid, context)); checks++;
}
assert.throws(() => validateMunicipalResults(result, { ...context, eligibleTerritory: false })); checks++;
assert.throws(() => validateMunicipalResults(result, { ...context, resultsAvailable: false })); checks++;
const empty = structuredClone(result);
empty.data.groups.forEach(g => { g.votes = 0; }); Object.keys(empty.data.totals).forEach(key => { empty.data.totals[key] = 0; }); empty.data.categoryTotal = 0; empty.data.groupPercentageDenominator.votes = 0;
assert.doesNotThrow(() => validateMunicipalResults(empty, context)); checks++;
console.log(JSON.stringify({ result: 'TERRITORIAL_RESULTS_CHECKED', checks, blankIncludedInDenominator: true, invalidOrStaleResponsesRejected: true, zeroDenominatorNotImputed: true }));
