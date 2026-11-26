import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localDate } from '../src/core/calendar.ts';
import { createTracker } from '../src/core/tracker.ts';
import { memoryStorage } from './support.ts';

const profile = { birthDate: '2004-06-08', sex: 'female', heightCm: 165, weightKg: 63, activity: 'low-active' } as const;

test('选中日期使用当时的个人资料版本，同日使用最新版本', async () => {
  let today = '2026-11-25';
  const storage = memoryStorage();
  const tracker = createTracker(storage, () => today);
  assert.equal((await tracker.daily_summary({ date: today })).maintenanceKcal, null);
  await tracker.profile_save(profile);

  // NASEM 第 7 章公开算例：22 岁、165 cm、63 kg、低活动的女性。
  assert.ok(Math.abs((await tracker.daily_summary({ date: today })).maintenanceKcal! - 2275.37) < 0.000001);

  today = '2026-11-26';
  await tracker.profile_save({ ...profile, weightKg: 65 });
  await tracker.profile_save({ ...profile, weightKg: 64 });
  const reopened = createTracker(storage, () => today);
  assert.equal((await reopened.profile_get()).weightKg, 64);
  assert.equal(Math.round((await reopened.daily_summary({ date: today })).maintenanceKcal!), 2288);
  assert.equal(Math.round((await reopened.daily_summary({ date: '2026-11-25' })).maintenanceKcal!), 2275);
  assert.equal((await reopened.daily_summary({ date: '2026-11-24' })).maintenanceKcal, null);
});

test('热量差值是估算维持热量减去摄入热量，可以为负数', async () => {
  const date = '2026-11-26';
  const tracker = createTracker(memoryStorage(), () => date);
  await tracker.profile_save(profile);
  const [entry] = await tracker.diet_create({ date, meal: 'dinner', items: [{
    newFood: { name: '试用餐食', nutrition: { per: { value: 1, unit: '份' }, values: { energyKcal: 2500 } } },
    amount: { value: 1, unit: '份' },
  }] });
  const over = await tracker.daily_summary({ date });
  assert.equal(over.totalKcal, 2500);
  assert.equal(Math.round(over.differenceKcal!), -225);
  await tracker.diet_delete({ id: entry.id });
  assert.equal(Math.round((await tracker.daily_summary({ date })).differenceKcal!), 2275);

  await tracker.profile_save({ ...profile, birthDate: '2011-01-01' });
  assert.equal((await tracker.daily_summary({ date })).differenceKcal, null);
});

test('个人资料版本在浏览器的新一天生效，宿主时区不改变之前的日期', async () => {
  const instant = new Date('2026-11-26T16:30:00Z');
  const tracker = createTracker(memoryStorage(), (zone?: string) => localDate(instant, zone ?? 'UTC'));
  await tracker.profile_save({ ...profile, timeZone: 'Asia/Singapore' });
  assert.equal((await tracker.daily_summary({ date: '2026-11-26' })).maintenanceKcal, null);
  assert.equal(Math.round((await tracker.daily_summary({ date: '2026-11-27' })).maintenanceKcal!), 2275);
  assert.equal((await tracker.profile_get({ timeZone: 'Asia/Singapore' })).weightKg, 63);
});
