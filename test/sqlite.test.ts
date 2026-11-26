import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createTracker } from '../src/core/tracker.ts';
import { createClientRoute } from '../src/host/route.ts';
import type { LegacyState } from '../src/storage/legacy-state.ts';
import { openSqlite } from '../src/storage/sqlite.ts';

const date = '2026-11-26';
const foodInput = (name: string) => ({ name, nutrition: { per: { value: 1, unit: '份' }, values: { energyKcal: 125 } } });

test('两个连接的写入均可见，批量记餐回执在重启后仍可重放', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'calorie-sqlite-test-'));
  const file = join(directory, 'calorie.sqlite');
  try {
    const left = openSqlite(file);
    const right = openSqlite(file);
    try {
    left.initialize();
    right.initialize();
    const a = createTracker(left);
    const b = createTracker(right);
    const food = await a.food_create(foodInput('米饭'));
    await b.food_create(foodInput('菜'));
    assert.equal((await a.food_search({})).length, 2);
    const batch = { date, meal: 'lunch', items: [{ foodId: food.id, amount: { value: 1, unit: '份' } }], operationId: 'meal-1' };
    const saved = await a.diet_create(batch);
    await assert.rejects(() => b.diet_create({ ...batch, meal: 'dinner' }), { code: 'CONFLICT' });
    left.close();
    right.close();
    const reopened = openSqlite(file);
    try {
      const c = createTracker(reopened);
      assert.deepEqual(await c.diet_create(batch), saved);
      assert.equal((await c.diet_query({ date })).totalKcal, 125);
    } finally { reopened.close(); }
    } finally { right.close(); left.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('迁移失败时回滚全部旧数据，修复来源后仍可以重新迁移', async () => {
  const store = openSqlite(':memory:');
  try {
    const state: LegacyState = {
      foods: [{ id: 'rice', ...foodInput('米饭') }],
      entries: [{ id: 'entry', date, meal: 'lunch', foodId: 'missing', amount: { value: 2, unit: '份' } }],
      profiles: [{ effectiveDate: date, profile: { weightKg: 68 } }],
    };
    assert.throws(() => store.initialize({ state }), /不存在的食物/);
    assert.equal(store.needsInitialization(), true);
    state.entries[0].foodId = 'rice';
    store.initialize({ state, sourceDigest: 'fixture-digest' });
    const tracker = createTracker(store, () => date);
    assert.equal((await tracker.diet_query({ date })).totalKcal, 250);
    assert.equal((await tracker.profile_get()).weightKg, 68);
    assert.equal(store.legacyDigest(), 'fixture-digest');
  } finally { store.close(); }
});

test('编辑食用量保留另一处的餐别修正，拒绝覆盖另一处对食用量的修改', async () => {
  const store = openSqlite(':memory:');
  try {
    store.initialize();
    const tracker = createTracker(store);
    const amount = { value: 1, unit: '份' };
    const [entry] = await tracker.diet_create({ date, meal: 'lunch', items: [{ newFood: foodInput('米饭'), amount }] });
    await tracker.diet_update({ id: entry.id, changes: { meal: 'dinner' } });
    const update = { id: entry.id, changes: { amount: { value: 2, unit: '份' } }, expected: { amount } };
    assert.equal((await tracker.diet_update(update)).meal, 'dinner');
    await assert.rejects(() => tracker.diet_update(update), { code: 'CONFLICT' });
    assert.equal((await tracker.diet_query({ date })).totalKcal, 250);
  } finally { store.close(); }
});

test('另一个连接正在写入时仍可查询，写入返回可重试的忙碌状态', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'calorie-sqlite-lock-'));
  const file = join(directory, 'calorie.sqlite');
  const store = openSqlite(file);
  const writer = new DatabaseSync(file);
  try {
    store.initialize();
    const tracker = createTracker(store);
    await tracker.food_create(foodInput('米饭'));
    writer.exec('BEGIN IMMEDIATE');
    const route = createClientRoute(tracker);
    const save = () => route(new Request('https://dsh.example/api/calorie-helper', {
      method: 'POST', body: JSON.stringify({ action: 'food_create', input: foodInput('青菜') }),
    }));
    assert.equal((await tracker.food_search({})).length, 1);
    const blocked = await save();
    assert.equal(blocked.status, 503);
    assert.equal((await blocked.json()).code, 'BUSY');
    writer.exec('ROLLBACK');
    assert.equal((await save()).status, 200);
    assert.equal((await tracker.food_search({})).length, 2);
  } finally {
    writer.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
