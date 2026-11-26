import { defineTool } from '@deepseek-ai/dsh-tools';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolName } from '../core/contracts.ts';
import type { Tracker } from '../core/tracker.ts';
import { toolParameters } from './tool-parameters.ts';

const descriptions: Record<ToolName, string> = {
  food_search: '按名称模糊搜索食物库，或按 id 精确查询。省略条件时列出食物。返回营养基准和份量换算。',
  food_create: '新增食物。填写 nutrition.per（数量和单位）、nutrition.values.energyKcal，以及已知的其他营养值。',
  food_update: '按 ID 修改食物。只传要更新的字段。变更营养资料时传完整的营养基准和数值，要清除份量换算可传空数组。',
  food_delete: '按 ID 删除食物。食物已有饮食记录引用时无法删除。',
  diet_create: '为同一日期、同一餐批量记餐。每项用 foodId 引用已有食物，或用 newFood 随批新增，并填写 amount。已有食物缺少单位换算时先用 food_update 补齐。任意一项失败时整批不保存。',
  diet_query: '用 date 查询一天的饮食，可指定 meal，也可只用 id 查单条。返回按实际食用量计算的已知营养和本次查询的总热量。',
  diet_update: '按 ID 修改一条饮食记录的日期、餐别、食物或食用量。',
  diet_delete: '按 ID 删除一条饮食记录。',
};

export function registerTools(ctx: Context, tracker: Tracker): void {
  for (const name of Object.keys(descriptions) as ToolName[]) {
    ctx.effect(() => ctx.tools.register(defineTool({
      name,
      description: descriptions[name],
      parameters: toolParameters[name],
      output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      execute: (args) => tracker[name](args),
    })), `calorie-helper: ${name}`);
  }
}
