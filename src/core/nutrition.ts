import type { FoodInput, NutritionValues, Quantity } from './contracts.ts';
import { TrackerError } from './errors.ts';

const metricUnits = new Map<string, { kind: string; scale: number }>();
for (const [kind, scale, names] of [
  ['mass', 0.001, ['mg', '毫克']],
  ['mass', 1, ['g', '克', '公克']],
  ['mass', 1000, ['kg', '千克', '公斤']],
  ['volume', 1, ['ml', '毫升']],
  ['volume', 1000, ['l', '升']],
] as const) {
  for (const name of names) metricUnits.set(name, { kind, scale });
}

const optionalNutrients = ['proteinG', 'fatG', 'carbsG', 'calciumMg'] as const;
const unitKey = (unit: string) => unit.normalize('NFKC').trim().toLowerCase();

function scaleBetween(from: string, to: string): number | undefined {
  const source = unitKey(from);
  const target = unitKey(to);
  if (source === target) return 1;

  const sourceMetric = metricUnits.get(source);
  const targetMetric = metricUnits.get(target);
  if (sourceMetric && targetMetric && sourceMetric.kind === targetMetric.kind) {
    return sourceMetric.scale / targetMetric.scale;
  }
  return undefined;
}

export function validatePortions(food: FoodInput): void {
  const units = new Set<string>();
  const baseUnit = food.nutrition.per.unit;
  for (const { unit, equals } of food.portions ?? []) {
    const key = unitKey(unit);
    const metric = metricUnits.get(key);
    const canonical = metric ? `metric:${metric.kind}` : key;
    if (units.has(canonical) || scaleBetween(unit, baseUnit) !== undefined) {
      throw new TrackerError(`「${unit}」已有对应的份量。`);
    }
    if (scaleBetween(equals.unit, baseUnit) === undefined) {
      throw new TrackerError(`请将「${unit}」换算为能与「${baseUnit}」互换的单位。`);
    }
    units.add(canonical);
  }
}

export function nutritionFor(food: FoodInput, amount: Quantity): NutritionValues {
  const { per, values } = food.nutrition;
  let scale = scaleBetween(amount.unit, per.unit);
  if (scale === undefined) {
    for (const portion of food.portions ?? []) {
      const enteredToPortion = scaleBetween(amount.unit, portion.unit);
      const portionToBase = scaleBetween(portion.equals.unit, per.unit);
      if (enteredToPortion === undefined || portionToBase === undefined) continue;
      scale = enteredToPortion * portion.equals.value * portionToBase;
      break;
    }
  }
  if (scale === undefined) {
    throw new TrackerError(`「${food.name}」还不能按「${amount.unit}」计算热量，请选择可用单位或补充份量换算。`, undefined, 'INVALID_UNIT');
  }

  const ratio = amount.value * scale / per.value;
  const result: NutritionValues = { energyKcal: values.energyKcal * ratio };
  for (const key of optionalNutrients) {
    const value = values[key];
    if (value !== undefined) result[key] = value * ratio;
  }
  if (!Object.values(result).every(Number.isFinite)) throw new TrackerError('请检查食用量和营养数值。');
  return result;
}
