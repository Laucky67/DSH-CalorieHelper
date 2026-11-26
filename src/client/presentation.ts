import type { Meal, Profile } from '../core/contracts.ts';

export const mealLabels: Record<Meal, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '零嘴',
};

export const activityLabels: Record<NonNullable<Profile['activity']>, string> = {
  inactive: '日常活动为主', 'low-active': '轻度活跃', active: '活跃', 'very-active': '非常活跃',
};

const energyNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
export function energyText(value: number): string {
  const rounded = Math.round(value);
  return rounded < 0 ? `−${energyNumber.format(-rounded)}` : energyNumber.format(Math.abs(rounded));
}

export function fieldText(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

export function optionalNumber(form: FormData, name: string): number | undefined {
  const value = fieldText(form, name);
  return value ? Number(value) : undefined;
}
