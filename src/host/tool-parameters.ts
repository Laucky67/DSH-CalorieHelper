import type { ParameterSchemaSpec, ValueSchemaSpec } from '@deepseek-ai/dsh-tools';
import { meals } from '../core/choices.ts';
import type { ToolName } from '../core/contracts.ts';

const string = { type: 'string' } as const;
const number = { type: 'number' } as const;
function required<Value extends ValueSchemaSpec>(schema: Value) {
  return { ...schema, required: true as const };
}
function object<Fields extends ParameterSchemaSpec>(properties: Fields) {
  return { type: 'object', properties, additionalProperties: false } as const;
}

const id = required({ ...string, description: '用搜索或新增工具返回的 ID。' });
const date = { ...string, description: '日历日期，格式 YYYY-MM-DD。' } as const;
const meal = { ...string, enum: meals } as const;
const quantity = object({ value: required(number), unit: required(string) });
const nutrition = object({
  per: required(quantity),
  values: required(object({
    energyKcal: required(number), proteinG: number, fatG: number, carbsG: number, calciumMg: number,
  })),
});
const portions = {
  type: 'array',
  items: object({ unit: required(string), equals: required(quantity) }),
  description: '每 1 个自定义单位对应的数量，例如 1 碗等于 150 g。',
} as const;
const newFood = object({ name: required(string), nutrition: required(nutrition), portions });

export const toolParameters: Record<ToolName, ParameterSchemaSpec> = {
  food_search: { id: string, query: string },
  food_create: newFood.properties,
  food_update: {
    id, changes: required(object({ name: string, nutrition, portions })),
  },
  food_delete: { id },
  diet_create: {
    date: required(date),
    meal: required(meal),
    items: required({
      type: 'array',
      items: object({ foodId: string, newFood, amount: required(quantity) }),
    }),
  },
  diet_query: { id: string, date, meal },
  diet_update: {
    id, changes: required(object({ date, meal, foodId: string, amount: quantity })),
  },
  diet_delete: { id },
};
