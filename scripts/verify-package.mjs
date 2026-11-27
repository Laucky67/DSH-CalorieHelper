import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const host = await import(new URL(`../${manifest.exports['.']}`, import.meta.url));
assert.equal(typeof host.apply, 'function');
assert(host.inject.includes('skills'));
await readFile(new URL('../skills/meal-logging/SKILL.md', import.meta.url));
const client = await readFile(manifest.exports['./client'], 'utf8');
assert(client.includes(`window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}`));
const patch = await readFile(manifest.dsh.bundle.patch, 'utf8');
assert(patch.includes(`name: ${manifest.name}`));
assert.equal(typeof (await import('../lib/data-layout.js')).dataDirectory, 'function');
await readFile(manifest.bin['calorie-helper-data']);
