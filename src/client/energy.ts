import type { DietItem, FoodInput, Meal } from '../core/contracts.ts';
import { nutritionFor } from '../core/nutrition.ts';

export function energyByMeal(items: DietItem[]): Record<Meal, number> {
  const totals: Record<Meal, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  for (const { meal, nutrition } of items) totals[meal] += nutrition.energyKcal;
  return totals;
}

export function estimatedEnergy(food: FoodInput, amount: string, unit: string): number | undefined {
  const value = Number(amount);
  if (!amount.trim() || !unit.trim() || !Number.isFinite(value) || value <= 0) return undefined;
  try { return nutritionFor(food, { value, unit: unit.trim() }).energyKcal; }
  catch { return undefined; }
}
