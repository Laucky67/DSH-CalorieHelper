import type { core, ZodType } from 'zod';

export class TrackerError extends Error {
  readonly detail: string;

  constructor(detail: string, item?: number) {
    super(item === undefined ? detail : `第 ${item} 项：${detail}`);
    this.name = 'TrackerError';
    this.detail = detail;
  }
}

function batchDetail(issue: core.$ZodIssue, item: unknown, fallback: string): string {
  if (issue.code === 'invalid_union') {
    const reference = item && typeof item === 'object' && 'foodId' in item;
    const newFood = item && typeof item === 'object' && 'newFood' in item;
    if (Boolean(reference) === Boolean(newFood)) return '请选择已有食物，或填写一条新食物资料。';
    const cause = issue.errors[newFood ? 1 : 0]?.[0];
    if (cause) return batchDetail(cause, item, fallback);
  }

  const path = issue.path;
  const last = path.at(-1);
  const labels = new Map<PropertyKey, string>([
    ['foodId', '食物 ID'], ['newFood', '新食物资料'], ['name', '食物名称'], ['energyKcal', '热量'],
    ['proteinG', '蛋白质'], ['fatG', '脂肪'], ['carbsG', '碳水'], ['calciumMg', '钙'],
    ['per', '营养计量基准'], ['amount', '食用量'], ['unit', '单位'],
  ]);
  const field = last === 'value'
    ? path.includes('amount') ? '食用量' : '计量数量'
    : last === 'unit' && path.includes('amount') ? '食用量单位' : labels.get(last ?? '');
  if (!field) return fallback;
  if (issue.code === 'too_small' && issue.origin === 'number' && issue.minimum === 0) {
    return `${field}必须${issue.inclusive ? '大于或等于' : '大于'} 0。`;
  }
  if (issue.code === 'invalid_type' && issue.expected === 'number') return `${field}必须是数字。`;
  return `${field}缺失或格式有误。`;
}

export function validated<Value>(schema: ZodType<Value>, input: unknown, message: string): Value {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const itemIndex = issue.path[0] === 'items' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
  if (itemIndex === null) throw new TrackerError(message);

  const items = input && typeof input === 'object' && 'items' in input ? input.items : undefined;
  const item = Array.isArray(items) ? items[itemIndex] : undefined;
  throw new TrackerError(batchDetail(issue, item, message), itemIndex + 1);
}
