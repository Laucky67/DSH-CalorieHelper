import type { core, ZodType } from 'zod';

export type ErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'CONFLICT' | 'FOOD_IN_USE' | 'BUSY' | 'STORAGE_FAILURE' | 'CANCELLED';

export class TrackerError extends Error {
  readonly detail: string;

  readonly code: ErrorCode;

  constructor(detail: string, item?: number, code: ErrorCode = 'INVALID_INPUT') {
    super(item === undefined ? detail : `第 ${item} 项：${detail}`);
    this.name = 'TrackerError';
    this.detail = detail;
    this.code = code;
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
  if (issue.code === 'too_small' && issue.origin === 'number') {
    if (issue.minimum === 0.000001) return `${field}必须大于 0，且至少为 0.000001。`;
    return `${field}必须${issue.inclusive ? '大于或等于' : '大于'} ${issue.minimum}。`;
  }
  if (issue.code === 'too_big' && issue.origin === 'number') return `${field}不能超过 ${issue.maximum}。`;
  if (issue.code === 'invalid_type' && issue.expected === 'number') return `${field}必须是数字。`;
  return `${field}缺失或格式有误。`;
}

export function validated<Value>(schema: ZodType<Value>, input: unknown, message: string): Value {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const itemIndex = issue.path[0] === 'items' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
  if (itemIndex === null) {
    const path = issue.path[0];
    if (path === 'date') throw new TrackerError('请选择有效的饮食日期。');
    if (path === 'meal') throw new TrackerError('请选择早餐、午餐、晚餐或零嘴。');
    if (path === 'items' && issue.code === 'too_small') throw new TrackerError('请至少添加一条饮食记录。');
    if (path === 'items' && issue.code === 'too_big') throw new TrackerError(`每次最多记 ${issue.maximum} 条饮食记录，请分次提交。`);
    if (path === 'heightCm' || path === 'weightKg') throw new TrackerError('请检查身高（厘米）和体重（千克）的数值。');
    throw new TrackerError(message);
  }

  const items = input && typeof input === 'object' && 'items' in input ? input.items : undefined;
  const item = Array.isArray(items) ? items[itemIndex] : undefined;
  throw new TrackerError(batchDetail(issue, item, message), itemIndex + 1);
}
