import { amountMax, amountMin, nutrientMax } from '../../core/contracts.ts';
import type { Food, FoodInput, NutritionValues } from '../../core/contracts.ts';
import { inRange, numberInput, parseNumber, visibleText } from '../format.ts';

export const nutrientFields = [
  { name: 'proteinG', label: '蛋白质', unit: '克' },
  { name: 'fatG', label: '脂肪', unit: '克' },
  { name: 'carbsG', label: '碳水', unit: '克' },
  { name: 'calciumMg', label: '钙', unit: '毫克' },
] as const;
export type NutrientName = (typeof nutrientFields)[number]['name'];

export const portionLimit = 30;

export type PortionRow = { key: number; unit: string; value: string; equalsUnit: string };
export type FoodDraft = {
  name: string;
  basisValue: string;
  basisUnit: string;
  energyKcal: string;
  portions: PortionRow[];
} & Record<NutrientName, string>;

export type FoodErrors = Partial<Record<string, string>>;

let rowKey = 0;
export function portionRow(equalsUnit = ''): PortionRow {
  rowKey += 1;
  return { key: rowKey, unit: '', value: '', equalsUnit };
}

export function emptyFoodDraft(name = ''): FoodDraft {
  return {
    name, basisValue: '100', basisUnit: 'g', energyKcal: '',
    proteinG: '', fatG: '', carbsG: '', calciumMg: '', portions: [],
  };
}

export function foodDraft(food: Food): FoodDraft {
  const { per, values } = food.nutrition;
  return {
    name: food.name,
    basisValue: numberInput(per.value),
    basisUnit: per.unit,
    energyKcal: numberInput(values.energyKcal),
    proteinG: numberInput(values.proteinG),
    fatG: numberInput(values.fatG),
    carbsG: numberInput(values.carbsG),
    calciumMg: numberInput(values.calciumMg),
    portions: (food.portions ?? []).map((portion) => ({
      ...portionRow(portion.equals.unit), unit: portion.unit, value: numberInput(portion.equals.value),
    })),
  };
}

/** 草稿内容是否相同（忽略行的内部 key）。 */
export function sameFoodDraft(a: FoodDraft, b: FoodDraft): boolean {
  const plain = (draft: FoodDraft) => JSON.stringify({
    ...draft, portions: draft.portions.map(({ unit, value, equalsUnit }) => [unit, value, equalsUnit]),
  });
  return plain(a) === plain(b);
}

/** 统一字段顺序，便于对比修改。 */
export function comparableFood(food: FoodInput): FoodInput {
  const { per, values } = food.nutrition;
  const ordered: NutritionValues = { energyKcal: values.energyKcal };
  for (const { name } of nutrientFields) if (values[name] !== undefined) ordered[name] = values[name];
  return {
    name: food.name,
    nutrition: { per: { value: per.value, unit: per.unit }, values: ordered },
    portions: food.portions?.map(({ unit, equals }) => ({ unit, equals: { value: equals.value, unit: equals.unit } })),
  };
}

function text(value: string, label: string, limit: number): { value?: string; error?: string } {
  const trimmed = value.trim();
  if (!trimmed || !visibleText(trimmed)) return { error: `请填写${label}` };
  if (trimmed.length > limit) return { error: `${label}最多 ${limit} 个字` };
  return { value: trimmed };
}

/** 把草稿转成提交内容；有问题时返回各字段的提示。 */
export function readFoodDraft(draft: FoodDraft, original?: Food): { input?: FoodInput; errors: FoodErrors } {
  const errors: FoodErrors = {};
  const name = text(draft.name, '名称', 160);
  if (name.error) errors.name = name.error;

  const basisValue = parseNumber(draft.basisValue);
  if (!inRange(basisValue, amountMin, amountMax)) errors.basisValue = '请填写有效数量';
  const basisUnit = text(draft.basisUnit, '单位', 24);
  if (basisUnit.error) errors.basisUnit = basisUnit.error;

  const energy = parseNumber(draft.energyKcal);
  if (energy === undefined) errors.energyKcal = '请填写热量';
  else if (!inRange(energy, 0, nutrientMax)) errors.energyKcal = '请填写有效数值';

  const values: NutritionValues = { energyKcal: energy ?? 0 };
  for (const { name: field } of nutrientFields) {
    const value = parseNumber(draft[field]);
    if (value === undefined) continue;
    if (!inRange(value, 0, nutrientMax)) errors[field] = '请填写有效数值';
    else values[field] = value;
  }

  const portions: NonNullable<FoodInput['portions']> = [];
  for (const row of draft.portions) {
    if (!row.unit.trim() && !row.value.trim()) continue;
    const unit = text(row.unit, '单位', 24);
    const value = parseNumber(row.value);
    const equalsUnit = text(row.equalsUnit, '单位', 24);
    if (unit.error) errors[`portion-${row.key}`] = '请填写份量单位';
    else if (!inRange(value, amountMin, amountMax)) errors[`portion-${row.key}`] = '请填写有效数量';
    else if (equalsUnit.error) errors[`portion-${row.key}`] = '请填写换算单位';
    else portions.push({ unit: unit.value!, equals: { value, unit: equalsUnit.value! } });
  }

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: comparableFood({
      name: name.value!,
      nutrition: { per: { value: basisValue as number, unit: basisUnit.value! }, values },
      portions: portions.length ? portions : original?.portions ? [] : undefined,
    }),
  };
}
