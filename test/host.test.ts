import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Context } from '@deepseek-ai/cordis';
import { ToolCallId } from '@deepseek-ai/dsh-llm';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import * as NativeExecutor from '@deepseek-ai/dsh-tool-executor-native';
import Tools from '@deepseek-ai/dsh-tools';
import { createTracker } from '../src/core/tracker.ts';
import { createClientRoute } from '../src/host/route.ts';
import { registerTools } from '../src/host/tools.ts';
import { memoryStorage } from './support.ts';

test('通过实际 DSH 工具批量记餐，页面接口可读取同一份饮食清单', async (t) => {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(Tools);
  await ctx.plugin(NativeExecutor);
  const tracker = createTracker(await memoryStorage());
  registerTools(ctx, () => tracker);
  const page = createClientRoute(() => tracker);
  const date = '2026-11-26';
  const rice = {
    name: '米饭', nutrition: { per: { value: 100, unit: 'g' }, values: { energyKcal: 116, proteinG: 2.6 } },
  };

  async function invoke(name: string, args: unknown) {
    if (name.endsWith('_create') || name.endsWith('_update') || name.endsWith('_delete')) {
      args = { operationId: crypto.randomUUID(), ...(args as object) };
    }
    const { results } = await ctx.tools.execute({
      signal: new AbortController().signal,
      calls: [{ type: 'tool-call', id: ToolCallId('calorie-test'), name, arguments: JSON.stringify(args) }],
    });
    return results[0].result;
  }

  const recorded = await invoke('diet_create', { date, meal: 'lunch', items: [
    { newFood: rice, amount: { value: 150, unit: 'g' } },
  ] });
  assert.equal(recorded.isError, false, JSON.stringify(recorded));
  const response = await page(new Request('https://dsh.example/api/calorie-helper', {
    method: 'POST', body: JSON.stringify({ action: 'daily_summary', input: { date } }),
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.result.totalKcal, 174);
  assert.equal(payload.result.items[0].foodName, '米饭');

  const invalid = await invoke('diet_create', { date, meal: 'dinner', items: [
    { newFood: { ...rice, name: '白粥' }, amount: { value: 100, unit: 'g' } },
    { newFood: { ...rice, name: '汤' }, amount: { value: 1, unit: '碗' } },
  ] });
  assert.equal(invalid.isError, true);
  assert.match(JSON.stringify(invalid.content), /第 2 项/);
  assert.deepEqual((await invoke('diet_query', { date, meal: 'dinner' })).value, { items: [], totalKcal: 0 });
  assert.deepEqual((await invoke('food_search', { query: '白粥' })).value, []);

  const invalidAmount = await invoke('diet_create', { date, meal: 'snack', items: [
    { newFood: { ...rice, name: '馒头' }, amount: { value: 100, unit: 'g' } },
    { newFood: { ...rice, name: '白菜' }, amount: { value: 0, unit: 'g' } },
  ] });
  assert.equal(invalidAmount.isError, true);
  assert.match(JSON.stringify(invalidAmount.content), /第 2 项.*食用量.*大于 0/);

  const pageError = await page(new Request('https://dsh.example/api/calorie-helper', {
    method: 'POST', body: JSON.stringify({ action: 'diet_create', input: { date, meal: 'dinner', items: [
      { newFood: { ...rice, name: '汤' }, amount: { value: 1, unit: '碗' } },
    ] } }),
  }));
  assert.equal(pageError.status, 400);
  const failure = await pageError.json();
  assert.match(failure.error, /补充份量换算/);
  assert.doesNotMatch(failure.error, /第 1 项/);

  const id = payload.result.items[0].id as string;
  const update = { id, changes: { amount: { value: 200, unit: 'g' } }, operationId: 'tool-edit-first' };
  assert.equal((await invoke('diet_update', update)).isError, false);
  assert.equal((await invoke('diet_update', { id, changes: { amount: { value: 250, unit: 'g' } } })).isError, false);
  assert.equal((await invoke('diet_update', update)).isError, false);
  assert.equal(((await invoke('diet_query', { id })).value as { totalKcal: number }).totalKcal, 290);
});

test('页面接口在读取过大的请求后拒绝处理，正常请求仍可使用', async () => {
  const tracker = createTracker(await memoryStorage());
  const route = createClientRoute(() => tracker);
  const page = (body: string) => route(new Request('https://dsh.example/api/calorie-helper', { method: 'POST', body }));
  assert.equal((await page(' '.repeat(1024 * 1024 + 1))).status, 413);
  assert.equal((await page('{"action":"food_search","input":{}}')).status, 200);
});
