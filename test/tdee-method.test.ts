import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clientResults } from '../src/core/contracts.ts';
import { createTracker } from '../src/core/tracker.ts';
import { createClientRoute } from '../src/host/route.ts';
import { memoryStorage } from './support.ts';
import { openSqlite } from '../src/storage/sqlite.ts';

test('页面保存 Mifflin–St Jeor 方案后可读回并获得估算维持热量', async () => {
  const tracker = createTracker(await memoryStorage(), () => '2026-11-28');
  const route = createClientRoute(() => tracker);
  async function call(action: string, input: unknown) {
    const response = await route(new Request('https://dsh.example/api/calorie-helper', {
      method: 'POST', body: JSON.stringify({ action, input }),
    }));
    assert.equal(response.status, 200, await response.clone().text());
    return (await response.json()).result;
  }
  const saved = await call('profile_save', {
    birthDate: '1996-01-01', sex: 'male', heightCm: 180, weightKg: 80,
    tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'active',
  });
  assert.equal(clientResults.profile_save.parse(saved).tdeeMethod, 'mifflin-st-jeor');
  const profile = await call('profile_get', {});
  assert.equal(profile.mifflinActivity, 'active');
  // 男性，30 岁，180 cm，80 kg，静息消耗 1780，乘中度活动系数得 2759。
  const summary = await call('daily_summary', { date: '2026-11-28' });
  assert.equal(summary.maintenanceKcal, 2759);
  assert.equal(summary.differenceKcal, 2759);
});

test('两种性别的四档活动系数均可计算，满 19 岁才提供估算', async () => {
  let today = '2026-11-28';
  const tracker = createTracker(await memoryStorage(), () => today);
  const activities = ['inactive', 'low-active', 'active', 'very-active'];
  const cases = [
    { sex: 'male', birthDate: '1996-01-01', heightCm: 180, weightKg: 80, expected: [2136, 2447.5, 2759, 3070.5] },
    { sex: 'female', birthDate: '2004-06-08', heightCm: 165, weightKg: 63, expected: [1668.3, 1911.59375, 2154.8875, 2398.18125] },
  ];
  for (const { expected, ...profile } of cases) {
    for (const [index, mifflinActivity] of activities.entries()) {
      await tracker.profile_save({ ...profile, tdeeMethod: 'mifflin-st-jeor', mifflinActivity });
      const summary = await tracker.daily_summary({ date: today });
      assert.ok(Math.abs(summary.maintenanceKcal! - expected[index]) < 0.000001);
    }
  }
  await tracker.profile_save({ birthDate: '2007-11-29', sex: 'male', heightCm: 180, weightKg: 80, tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'inactive' });
  assert.equal((await tracker.daily_summary({ date: today })).maintenanceKcal, null);
  today = '2026-11-29';
  assert.equal((await tracker.daily_summary({ date: today })).maintenanceKcal, 2202);
  await tracker.profile_save({ tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'inactive' });
  assert.equal((await tracker.daily_summary({ date: today })).differenceKcal, null);
});

test('存量资料默认采用 NASEM，选择新方案后重启仍保留两套活动等级', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'calorie-tdee-'));
  const file = join(directory, 'tracker.sqlite');
  const store = openSqlite(file);
  const basics = { birthDate: '2004-06-08', sex: 'female', heightCm: 165, weightKg: 63, activity: 'low-active' } as const;
  try {
    await store.initialize({ state: { foods: [], entries: [], profiles: [{ effectiveDate: '2026-11-27', profile: basics }] } });
    const tracker = createTracker(store, () => '2026-11-28');
    const original = await tracker.profile_get();
    assert.equal(original.tdeeMethod, 'nasem-2023');
    assert.equal((await tracker.profile_save({ ...basics, expectedVersion: original.version })).version, original.version);
    await assert.rejects(() => tracker.profile_save({ ...basics, tdeeMethod: 'mifflin-st-jeor' }), /活动等级/);
    await assert.rejects(() => tracker.profile_save({ ...basics, tdeeMethod: 'unknown' }));
    await tracker.profile_save({ ...basics, tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'active', operationId: 'choose-mifflin' });
    const saved = await tracker.profile_get();
    store.close();
    const reopened = openSqlite(file);
    try {
      const next = createTracker(reopened, () => '2026-11-28');
      assert.deepEqual(await next.profile_get(), saved);
      const retry = await next.profile_save({ ...basics, tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'active', operationId: 'choose-mifflin' });
      assert.equal(retry.version, saved.version);
      assert.equal((await next.daily_summary({ date: '2026-11-27' })).maintenanceKcal, 2275.37);
      assert.equal((await next.daily_summary({ date: '2026-11-26' })).maintenanceKcal, null);
    } finally { reopened.close(); }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('两种方案分别记住活动等级，方案随个人资料版本按日期生效', async () => {
  let today = '2026-11-27';
  const storage = await memoryStorage();
  const tracker = createTracker(storage, () => today);
  const basics = { birthDate: '2004-06-08', sex: 'female', heightCm: 165, weightKg: 63 };
  const original = await tracker.profile_save({ ...basics, activity: 'low-active' });
  assert.equal(original.tdeeMethod, 'nasem-2023');
  assert.equal((await tracker.daily_summary({ date: today })).maintenanceKcal, 2275.37);
  today = '2026-11-28';
  const mifflin = await tracker.profile_save({ ...basics, tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'active' });
  assert.equal(mifflin.activity, 'low-active');
  assert.ok(Math.abs((await tracker.daily_summary({ date: today })).maintenanceKcal! - 2154.8875) < 0.000001);
  assert.equal((await tracker.daily_summary({ date: '2026-11-27' })).maintenanceKcal, 2275.37);
  const restored = await tracker.profile_save({ ...basics, tdeeMethod: 'nasem-2023', activity: 'low-active' });
  assert.equal(restored.mifflinActivity, 'active');
  assert.equal((await tracker.daily_summary({ date: today })).maintenanceKcal, 2275.37);
  assert.equal((await createTracker(storage, () => today).profile_get()).mifflinActivity, 'active');
});

test('首次从 Mifflin–St Jeor 切到 NASEM 时也需要选择活动等级', async () => {
  const tracker = createTracker(await memoryStorage(), () => '2026-11-28');
  const original = await tracker.profile_save({ tdeeMethod: 'mifflin-st-jeor', mifflinActivity: 'active' });
  await assert.rejects(() => tracker.profile_save({ tdeeMethod: 'nasem-2023' }), /活动等级/);
  assert.equal((await tracker.profile_get()).version, original.version);
  const saved = await tracker.profile_save({ tdeeMethod: 'nasem-2023', activity: 'low-active' });
  assert.equal(saved.activity, 'low-active');
  assert.equal(saved.mifflinActivity, 'active');
});
