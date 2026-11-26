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

test('通过实际 DSH 工具派发写入批次，页面接口可读取同一份清单', async (t) => {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(Tools);
  await ctx.plugin(NativeExecutor);
  const tracker = createTracker(memoryStorage());
  registerTools(ctx, tracker);
  const page = createClientRoute(tracker);
  const date = '2026-11-26';
  const rice = {
    name: '米饭', nutrition: { per: { value: 100, unit: 'g' }, values: { energyKcal: 116, proteinG: 2.6 } },
  };

  async function invoke(name: string, args: unknown) {
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
});
