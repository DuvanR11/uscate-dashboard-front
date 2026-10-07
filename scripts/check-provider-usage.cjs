/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS verification script. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/provider-usage.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = { exports: {} };
new Function('module', 'exports', compiled)(target, target.exports);
const { usageDecimal, usageInterval } = target.exports;
assert.equal(usageDecimal(null), 'Pendiente');
assert.equal(usageDecimal('0'), '0');
assert.equal(usageDecimal('12345678901234567890.000001'), '12.345.678.901.234.567.890,000001');
assert.deepEqual(usageInterval('2026-10-07', '2026-10-07'), { from: '2026-10-07T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z' });
assert.doesNotThrow(() => usageInterval('2026-01-01', '2026-03-31'));
for (const dates of [['2026-01-01', '2026-04-01'], ['2026-02-30', '2026-03-01'], ['', '2026-10-07'], ['2026-10-08', '2026-10-07']]) {
  assert.throws(() => usageInterval(...dates));
}
console.log('Provider usage: precision, unknown/zero and UTC interval checks passed.');
