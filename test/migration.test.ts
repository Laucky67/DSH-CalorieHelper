import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Context } from '@deepseek-ai/cordis';
import { createTracker } from '../src/core/tracker.ts';
import { openPluginStorage } from '../src/host/storage.ts';
import { emptyLegacyState } from '../src/storage/legacy-state.ts';
import type { LegacyState } from '../src/storage/legacy-state.ts';

const date = '2026-11-26';
const state: LegacyState = {
  foods: [{ id: 'rice', name: '米饭', nutrition: { per: { value: 100, unit: 'g' }, values: { energyKcal: 120 } } }],
  entries: [{ id: 'entry-1', date, meal: 'lunch', foodId: 'rice', amount: { value: 150, unit: 'g' } }],
  profiles: [{ effectiveDate: date, profile: { weightKg: 70 } }],
};
const document = (data: LegacyState) => JSON.stringify({ unit: { name: 'calorie_helper', version: 1 }, global: data, tables: {} });
const backend = (data: LegacyState) => ({ storageDomain: { async open() { return { global: { get: () => data }, async close() {} }; } } }) as unknown as Context;

test('自定义 DSH_HOME 中升级真实旧版文件格式，路由为空时也不会漏导入，重启不会重复导入', async (t) => {
  const home = await mkdtemp(join(tmpdir(), '卡路里 迁移-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const storages = join(home, 'storages');
  await mkdir(storages);
  const original = join(storages, 'calorie_helper.json');
  const contents = document(state);
  await writeFile(original, contents);
  const storage = await openPluginStorage(backend(emptyLegacyState), home);
  try { assert.equal((await createTracker(storage).daily_summary({ date })).totalKcal, 180); }
  finally { storage.close(); }
  const archive = join(storages, 'calorie-helper', 'legacy-calorie_helper.json');
  assert.equal(await readFile(archive, 'utf8'), contents);
  await assert.rejects(() => access(original), { code: 'ENOENT' });

  const reopened = await openPluginStorage(backend(state), home);
  try {
    const tracker = createTracker(reopened, () => date);
    assert.equal((await tracker.diet_query({ date })).items.length, 1);
    assert.equal((await tracker.profile_get()).weightKg, 70);
  } finally { reopened.close(); }
});

test('旧文件损坏或两份旧数据冲突时保留原文件，修正来源后能重试', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'calorie-migration-retry-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const storages = join(home, 'storages');
  await mkdir(storages);
  const original = join(storages, 'calorie_helper.json');
  await writeFile(original, '{invalid');
  await assert.rejects(() => openPluginStorage(backend(emptyLegacyState), home), /旧版卡路里数据格式有误/);
  assert.equal(await readFile(original, 'utf8'), '{invalid');

  await writeFile(original, document(state));
  const other = { ...state, profiles: [{ effectiveDate: date, profile: { weightKg: 71 } }] };
  await assert.rejects(() => openPluginStorage(backend(other), home), /两份内容不同/);
  assert.equal(await readFile(original, 'utf8'), document(state));
  const storage = await openPluginStorage(backend(state), home);
  try { assert.equal((await createTracker(storage).diet_query({ date })).items[0].id, 'entry-1'); }
  finally { storage.close(); }
});
