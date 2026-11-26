import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTracker } from '../src/core/tracker.ts';
import { memoryStorage } from './support.ts';

const date = '2026-11-26';
const rice = {
  name: '米饭',
  nutrition: { per: { value: 100, unit: 'g' }, values: { energyKcal: 116, proteinG: 2.6, fatG: 0 } },
  portions: [{ unit: '碗', equals: { value: 150, unit: 'g' } }],
};
const burger = {
  name: '鸡腿堡',
  nutrition: { per: { value: 1, unit: '个' }, values: { energyKcal: 500 } },
};

test('一批同时写入已有食物和新食物，并按实际食用量查询营养', async () => {
  const storage = memoryStorage();
  const tracker = createTracker(storage);
  const saved = await tracker.food_create(rice);
  const added = await tracker.diet_create({ date, meal: 'lunch', items: [
    { foodId: saved.id, amount: { value: 1, unit: '碗' } },
    { foodId: saved.id, amount: { value: 0.25, unit: 'kg' } },
    { newFood: burger, amount: { value: 0.5, unit: '个' } },
  ] });

  const reopened = createTracker(storage);
  const { items, totalKcal } = await reopened.diet_query({ date, meal: 'lunch' });
  assert.deepEqual(items.map((item) => item.id), added.map((item) => item.id));
  assert.equal(totalKcal, 714);
  assert.equal(items[0].nutrition.energyKcal, 174);
  assert.equal(items[0].nutrition.fatG, 0);
  assert.equal(items[1].nutrition.proteinG, 6.5);
  assert.deepEqual(items[2].nutrition, { energyKcal: 250 });
  assert.equal((await reopened.food_search({ query: '鸡腿堡' })).length, 1);
});

test('批内存在无法计算热量的食用量时，食物和记录均不写入', async () => {
  const tracker = createTracker(memoryStorage());
  await assert.rejects(tracker.diet_create({ date, meal: 'lunch', items: [
    { newFood: rice, amount: { value: 1, unit: '碗' } },
    { newFood: burger, amount: { value: 1, unit: 'g' } },
  ] }), /第 2 项.*无法|第 2 项.*还不能/);
  assert.deepEqual(await tracker.food_search({}), []);
  assert.deepEqual(await tracker.diet_query({ date }), { items: [], totalKcal: 0 });
});

test('记录可更正日期和餐别，食物修订即时可见且有引用时不能删除', async () => {
  const tracker = createTracker(memoryStorage());
  const food = await tracker.food_create(rice);
  const [entry] = await tracker.diet_create({ date, meal: 'dinner', items: [
    { foodId: food.id, amount: { value: 1, unit: '碗' } },
  ] });
  await assert.rejects(tracker.food_delete({ id: food.id }), /已用于饮食记录/);
  await tracker.food_update({ id: food.id, changes: { portions: [{ unit: '碗', equals: { value: 200, unit: 'g' } }] } });
  assert.equal((await tracker.diet_query({ id: entry.id })).totalKcal, 232);
  const corrected = await tracker.diet_update({ id: entry.id, changes: {
    date: '2026-11-25', meal: 'lunch', amount: { value: 2, unit: '碗' },
  } });
  assert.equal(corrected.nutrition.energyKcal, 464);
  assert.equal((await tracker.diet_query({ date })).totalKcal, 0);
  assert.equal((await tracker.diet_query({ date: '2026-11-25', meal: 'lunch' })).totalKcal, 464);
  await tracker.diet_delete({ id: entry.id });
  await tracker.food_delete({ id: food.id });
  assert.deepEqual(await tracker.food_search({}), []);
});
