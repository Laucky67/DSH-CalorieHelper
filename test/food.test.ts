import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTracker } from '../src/core/tracker.ts';
import { memoryStorage } from './support.ts';

test('按食物 ID 读取已保存的营养资料', async () => {
  const tracker = createTracker(await memoryStorage());
  const food = await tracker.food_create({
    name: '胡萝卜',
    nutrition: { per: { value: 100, unit: 'g' }, values: { energyKcal: 41, fatG: 0 } },
  });
  assert.deepEqual(await tracker.food_search({ id: food.id }), [food]);
  assert.deepEqual(food.nutrition.values, { energyKcal: 41, fatG: 0 });
});

test('自然名称搜索按相关度返回食物，完全匹配优先', async () => {
  const tracker = createTracker(await memoryStorage());
  const nutrition = { per: { value: 100, unit: 'g' }, values: { energyKcal: 41 } };
  const first = await tracker.food_create({ name: '山姆胡萝卜', nutrition });
  await tracker.food_create({ name: '白米饭', nutrition });
  assert.deepEqual(await tracker.food_search({ query: '山姆的胡萝卜' }), [first]);
  const exact = await tracker.food_create({ name: '山姆的胡萝卜', nutrition });
  assert.deepEqual(await tracker.food_search({ query: '山姆的胡萝卜' }), [exact, first]);
});

test('重名保存失败且可继续修改和删除食物', async () => {
  const tracker = createTracker(await memoryStorage());
  const nutrition = { per: { value: 1, unit: '个' }, values: { energyKcal: 100 } };
  const food = await tracker.food_create({ name: '面包', nutrition });
  await assert.rejects(tracker.food_create({ name: ' 面包 ', nutrition }), /同名/);
  const edited = await tracker.food_update({ id: food.id, changes: { name: '小面包' } });
  assert.equal(edited.name, '小面包');
  await tracker.food_delete({ id: food.id });
  assert.deepEqual(await tracker.food_search({ id: food.id }), []);
});
