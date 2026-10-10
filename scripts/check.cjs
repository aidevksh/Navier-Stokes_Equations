/* Copyright 2026 AIDevKSH. Licensed under the Apache License, Version 2.0. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique');
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  assert(ids.includes(match[1]), `Missing anchor: ${match[1]}`);
}
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"#]+|LICENSE)"/g)) {
  assert(fs.existsSync(path.join(root, match[1])), `Missing local file: ${match[1]}`);
}
assert.equal((html.match(/<canvas\b/g) || []).length, 4);
assert((html.match(/<math\b/g) || []).length >= 7, 'Native equations must be present');
assert(!/<script\b[^>]*src="https?:/i.test(html), 'Report must work offline');
assert(fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').includes('Apache License'));
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).license, 'Apache-2.0');
console.log('PASS: local assets, anchors, 4 canvases, native MathML, Apache 2.0.');
