import { amountMax, amountMin } from '../../core/contracts.ts';
import type { DailySummary, DietItem, FoodInput, Meal, Quantity } from '../../core/contracts.ts';
import { request } from '../api.ts';
import { estimatedEnergy } from '../energy.ts';
import { inRange, numberInput, parseNumber, visibleText } from '../format.ts';

export function loadSummary(date: string, signal?: AbortSignal): Promise<DailySummary> {
  return request('daily_summary', { date }, signal);
}

export type Entry = { date: string; meal: Meal; foodId: string; amount: Quantity };

/** 记录的可比较字段，用于构造修改与删除请求。 */
export function entryOf(item: DietItem): Entry {
  return { date: item.date, meal: item.meal, foodId: item.foodId, amount: { value: item.amount.value, unit: item.amount.unit } };
}

/** 食物可用的快捷单位：计量单位和份量单位。 */
export function unitChoices(food: FoodInput): Array<{ unit: string; hint?: string }> {
  const seen = new Set<string>();
  const choices: Array<{ unit: string; hint?: string }> = [];
  const add = (unit: string, hint?: string) => {
    const key = unit.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    choices.push({ unit, hint });
  };
  add(food.nutrition.per.unit);
  for (const portion of food.portions ?? []) add(portion.unit, `1 ${portion.unit} = ${numberInput(portion.equals.value)} ${portion.equals.unit}`);
  return choices;
}

/** 选中食物时的默认食用量：计量数量 + 计量单位。 */
export function defaultAmount(food: FoodInput): { amount: string; unit: string } {
  return { amount: numberInput(food.nutrition.per.value), unit: food.nutrition.per.unit };
}

/** 换成另一种食物时，若原单位仍可换算就保留原食用量。 */
export function amountForSwitch(food: FoodInput, amount: string, unit: string): { amount: string; unit: string } {
  return estimatedEnergy(food, amount, unit) !== undefined ? { amount, unit } : defaultAmount(food);
}

export type AmountErrors = { amount?: string; unit?: string };

export function readAmount(amount: string, unit: string): { quantity?: Quantity; errors: AmountErrors } {
  const errors: AmountErrors = {};
  const value = parseNumber(amount);
  if (!inRange(value, amountMin, amountMax)) errors.amount = '请填写有效数量';
  const trimmed = unit.trim();
  if (!trimmed || !visibleText(trimmed)) errors.unit = '请填写单位';
  else if (trimmed.length > 24) errors.unit = '单位最多 24 个字';
  if (Object.keys(errors).length || value === undefined) return { errors };
  return { errors, quantity: { value, unit: trimmed } };
}
