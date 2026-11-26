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
const nutrientValues = object({
  energyKcal: required(number), proteinG: number, fatG: number, carbsG: number, calciumMg: number,
});
const nutrition = object({ per: required(quantity), values: required(nutrientValues) });
const portions = {
  type: 'array',
  items: object({ unit: required(string), equals: required(quantity) }),
  description: '每 1 个自定义单位对应的数量，例如 1 碗等于 150 g。',
} as const;
const newFood = object({ name: required(string), nutrition: required(nutrition), portions });
const operationId = required({ ...string, description: '为每次操作生成唯一标识。同一次操作重试时必须复用此标识及原参数。' });
const foodChanges = object({ name: string, nutrition, portions });
const entryChanges = object({ date, meal, foodId: string, amount: quantity });
const limit = { type: 'integer', description: '每页条数，默认 100，上限 200。' } as const;
const offset = { type: 'integer', description: '从第几条开始，第一页填 0。' } as const;

export const toolParameters: Record<ToolName, ParameterSchemaSpec> = {
  food_search: { id: string, query: string, limit, offset },
  food_create: { ...newFood.properties, operationId },
  food_update: {
    id, changes: required(foodChanges), expected: foodChanges, operationId,
  },
  food_delete: { id, expected: foodChanges, operationId },
  diet_create: {
    date: required(date),
    meal: required(meal),
    operationId,
    items: required({
      type: 'array',
      items: object({ foodId: string, newFood, amount: required(quantity) }),
    }),
  },
  diet_query: { id: string, date, meal, limit, offset },
  diet_update: {
    id, changes: required(entryChanges), expected: entryChanges, operationId,
  },
  diet_delete: { id, expected: entryChanges, operationId },
};

const foodResult = object({ ...newFood.properties, id });
const entryResult = object({ id, date: required(date), meal: required(meal), foodId: id, amount: required(quantity),
  foodName: required(string), nutrition: required(nutrientValues),
});
const deleteResult = object({ id });
const list = <Value extends ValueSchemaSpec>(items: Value) => ({ type: 'array', items } as const);
export const toolResults: Record<ToolName, ValueSchemaSpec> = {
  food_search: list(foodResult), food_create: foodResult, food_update: foodResult, food_delete: deleteResult,
  diet_create: list(entryResult), diet_query: object({ items: required(list(entryResult)), totalKcal: required(number) }),
  diet_update: entryResult, diet_delete: deleteResult,
};
