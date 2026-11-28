import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTracker } from '../src/core/tracker.ts';
import { localDate } from '../src/core/calendar.ts';
import { clientResults } from '../src/core/contracts.ts';
import { createClientRoute } from '../src/host/route.ts';
import { memoryStorage } from './support.ts';

async function readTrends(tracker: ReturnType<typeof createTracker>, range = '7', timeZone?: string) {
  const response = await createClientRoute(() => tracker)(new Request('https://dsh.example/api/calorie-helper', {
    method: 'POST', body: JSON.stringify({ action: 'trends', input: { range, timeZone } }),
  }));
  assert.equal(response.status, 200);
  return clientResults.trends.parse((await response.json()).result);
}

test('趋势接口展示最近七天，缺记录留空，维持热量遵循个人资料版本', async (t) => {
  const storage = await memoryStorage();
  t.after(() => storage.close());
  let today = '2026-11-25';
  const tracker = createTracker(storage, () => today);
  const route = createClientRoute(() => tracker);
  const profile = { birthDate: '2004-06-08', sex: 'female', heightCm: 165, weightKg: 63, activity: 'low-active' };
  await tracker.profile_save(profile);
  today = '2026-11-28';
  await tracker.profile_save({ ...profile, weightKg: 64 });
  await tracker.diet_create({ date: '2026-11-26', meal: 'lunch', items: [{
    newFood: { name: '米饭', nutrition: { per: { value: 100, unit: 'g' }, values: { energyKcal: 116 } } },
    amount: { value: 200, unit: 'g' },
  }] });
  const response = await route(new Request('https://dsh.example/api/calorie-helper', {
    method: 'POST', body: JSON.stringify({ action: 'trends', input: { range: '7' } }),
  }));
  assert.equal(response.status, 200);
  const { result } = await response.json();
  assert.equal(result.days.length, 7);
  assert.equal(result.days[0].date, '2026-11-22');
  assert.equal(result.days.at(-1).date, '2026-11-28');
  assert.equal(result.days[0].maintenanceKcal, null);
  assert.equal(result.days[4].intakeKcal, 232);
  assert.equal(result.days[5].intakeKcal, null);
  assert.equal(Math.round(result.days[4].maintenanceKcal), 2275);
  assert.equal(Math.round(result.days[6].maintenanceKcal), 2288);
});

test('每日平均逐项排除资料不完整的记录日，显式零参与平均', async (t) => {
  const storage = await memoryStorage();
  t.after(() => storage.close());
  const tracker = createTracker(storage, () => '2026-11-28');
  const chicken = await tracker.food_create({
    name: '鸡胸肉', nutrition: { per: { value: 1, unit: '份' }, values: { energyKcal: 150, proteinG: 30, carbsG: 0 } },
  });
  const rice = await tracker.food_create({
    name: '米饭', nutrition: { per: { value: 1, unit: '碗' }, values: { energyKcal: 200, carbsG: 50 } },
  });
  await tracker.diet_create({ date: '2026-11-26', meal: 'lunch', items: [
    { foodId: chicken.id, amount: { value: 1, unit: '份' } },
    { foodId: rice.id, amount: { value: 1, unit: '碗' } },
  ] });
  await tracker.diet_create({ date: '2026-11-27', meal: 'dinner', items: [
    { foodId: chicken.id, amount: { value: 2, unit: '份' } },
  ] });
  const result = await readTrends(tracker);
  assert.equal(result.recordedDays, 2);
  assert.deepEqual(result.averages, {
    proteinG: { grams: 60, days: 1 }, carbsG: { grams: 25, days: 2 }, fatG: { grams: null, days: 0 },
  });
  await tracker.food_update({ id: rice.id, changes: {
    nutrition: { ...rice.nutrition, values: { ...rice.nutrition.values, proteinG: 10 } },
  } });
  const updated = await readTrends(tracker);
  assert.deepEqual(updated.averages.proteinG, { grams: 50, days: 2 });
});

test('各日期范围共用全历史连续天数，修改和删除饮食记录后立即更新', async (t) => {
  const storage = await memoryStorage();
  t.after(() => storage.close());
  let today = '2026-11-28';
  const tracker = createTracker(storage, () => today);
  const food = await tracker.food_create({ name: '牛奶', nutrition: {
    per: { value: 1, unit: '杯' }, values: { energyKcal: 120, proteinG: 8 },
  } });
  const ids = new Map<string, string>();
  for (const date of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-26', '2026-11-27', '2026-11-29']) {
    const [entry] = await tracker.diet_create({ date, meal: 'breakfast', items: [
      { foodId: food.id, amount: { value: 1, unit: '杯' } },
    ] });
    ids.set(date, entry.id);
  }
  for (const [range, length, start] of [
    ['7', 7, '2026-11-22'], ['30', 30, '2026-10-30'], ['90', 90, '2026-08-31'], ['all', 59, '2026-10-01'],
  ] as const) {
    const result = await readTrends(tracker, range);
    assert.deepEqual(result.streak, { current: 2, longest: 3 });
    assert.equal(result.days.length, length);
    assert.equal(result.days[0].date, start);
    assert.equal(result.days.at(-1)?.date, today);
  }
  await tracker.diet_update({ id: ids.get('2026-11-27'), changes: { amount: { value: 2, unit: '杯' } } });
  assert.equal((await readTrends(tracker)).days[5].intakeKcal, 240);
  await tracker.diet_delete({ id: ids.get('2026-11-27') });
  const deleted = await readTrends(tracker);
  assert.deepEqual(deleted.streak, { current: 0, longest: 3 });
  assert.equal(deleted.days[5].intakeKcal, null);
  today = '2026-11-29';
  assert.deepEqual((await readTrends(tracker)).streak, { current: 1, longest: 3 });
});

test('没有饮食记录时显示空统计，记录日按设备时区截至今天', async (t) => {
  const storage = await memoryStorage();
  t.after(() => storage.close());
  const instant = new Date('2026-11-27T17:00:00Z');
  const tracker = createTracker(storage, (zone) => localDate(instant, zone ?? 'UTC'));
  const empty = await readTrends(tracker, 'all', 'Asia/Singapore');
  assert.deepEqual(empty.days, []);
  assert.deepEqual(empty.streak, { current: 0, longest: 0 });
  assert.equal(empty.recordedDays, 0);
  assert.deepEqual(empty.averages.proteinG, { grams: null, days: 0 });
  const [entry] = await tracker.diet_create({ date: '2026-11-28', meal: 'breakfast', items: [{
    newFood: { name: '饮用水', nutrition: { per: { value: 1, unit: '杯' }, values: { energyKcal: 0, proteinG: 0 } } },
    amount: { value: 1, unit: '杯' },
  }] });
  const result = await readTrends(tracker, '7', 'Asia/Singapore');
  assert.deepEqual(result.days.at(-1), { date: '2026-11-28', intakeKcal: 0, maintenanceKcal: null });
  assert.deepEqual(result.streak, { current: 1, longest: 1 });
  assert.deepEqual(result.averages.proteinG, { grams: 0, days: 1 });
  assert.equal((await readTrends(tracker, 'all', 'UTC')).days.length, 0);
  await tracker.diet_delete({ id: entry.id });
  assert.equal((await readTrends(tracker, 'all', 'Asia/Singapore')).days.length, 0);
});
