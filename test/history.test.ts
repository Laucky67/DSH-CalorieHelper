import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { energyText } from '../src/client/presentation.ts';
import { shiftDate } from '../src/core/calendar.ts';
import { dateSchema } from '../src/core/contracts.ts';
import { createTracker } from '../src/core/tracker.ts';
import { openSqlite } from '../src/storage/sqlite.ts';

test('普通日期能跨越月末、年末和闰日，日期校验拒绝无效日历日', () => {
  assert.equal(shiftDate('2026-04-30', 1), '2026-05-01');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDate('2024-02-28', 1), '2024-02-29');
  assert.equal(shiftDate('2024-02-29', 1), '2024-03-01');
  assert.equal(shiftDate('2026-02-28', 1), '2026-03-01');
  assert.equal(dateSchema.safeParse('2026-02-30').success, false);
  assert.equal(energyText(0), '0');
  assert.equal(energyText(375), '375');
  assert.equal(energyText(-0.4), '−0.4');
});

test('七年日常饮食记录下，按日期走索引并返回完整的单日、单餐合计', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'calorie-history-'));
  const file = join(directory, 'calorie.sqlite');
  const store = openSqlite(file);
  try {
    await store.initialize();
    const tracker = createTracker(store);
    const food = await tracker.food_create({ name: '面包', nutrition: { per: { value: 1, unit: '片' }, values: { energyKcal: 80 } } });
    const days = 365 * 7;
    let date = '2020-01-01';
    const seeded = performance.now();
    await store.write(() => {
      for (let day = 0; day < days; day++) {
        for (let index = 0; index < 10; index++) store.insertEntry({
          id: `entry-${day}-${index}`, date, meal: index < 4 ? 'breakfast' : 'dinner', foodId: food.id, amount: { value: 1, unit: '片' },
        });
        date = shiftDate(date, 1);
      }
    });
    const queried = performance.now();
    const summary = await tracker.daily_summary({ date: '2025-12-31' });
    const breakfast = await tracker.diet_query({ date: '2025-12-31', meal: 'breakfast', limit: 2, offset: 1 });
    const finished = performance.now();
    assert.equal(summary.items.length, 10);
    assert.equal(summary.totalKcal, 800);
    assert.equal(breakfast.items.length, 2);
    assert.equal(breakfast.totalKcal, 320);
    const reader = new DatabaseSync(file, { readOnly: true });
    try {
      const plan = reader.prepare('EXPLAIN QUERY PLAN SELECT e.*, f.name, f.nutrition, f.portions FROM diet_entries e JOIN foods f ON f.id=e.food_id WHERE e.date=? ORDER BY e.rowid').all('2025-12-31');
      assert(plan.some(({ detail }) => String(detail).includes('diet_entries_by_date_meal')));
    } finally { reader.close(); }
    t.diagnostic(`${days * 10} 条磁盘记录，生成 ${(queried - seeded).toFixed(1)} ms，日摘要和单餐查询共 ${(finished - queried).toFixed(1)} ms`);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
