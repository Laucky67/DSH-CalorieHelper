import type { Meal, Profile } from '../core/contracts.ts';

export const mealLabels: Record<Meal, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '零嘴',
};

export const activityLabels: Record<NonNullable<Profile['activity']>, string> = {
  inactive: '日常活动为主', 'low-active': '轻度活跃', active: '活跃', 'very-active': '非常活跃',
};

const energyNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const smallEnergyNumber = new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 2 });
export function energyText(value: number): string {
  const magnitude = Math.abs(value);
  const format = magnitude > 0 && magnitude < 0.5 ? smallEnergyNumber : energyNumber;
  return `${value < 0 ? '−' : ''}${format.format(magnitude)}`;
}

export function fieldText(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

export function optionalNumber(form: FormData, name: string): number | undefined {
  const value = fieldText(form, name);
  return value ? Number(value) : undefined;
}
