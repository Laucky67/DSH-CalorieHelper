import type { DailySummary, Profile } from './contracts.ts';
import { queryEntries } from './diets.ts';
import type { TrackerRepository } from './repository.ts';

// NASEM 2023, Dietary Reference Intakes for Energy, 表 5-16。
// 每组依次是常数、年龄、身高（厘米）和体重（千克）的系数。
const coefficients = {
  female: {
    'inactive': [584.90, -7.01, 5.72, 11.71],
    'low-active': [575.77, -7.01, 6.60, 12.14],
    'active': [710.25, -7.01, 6.54, 12.34],
    'very-active': [511.83, -7.01, 9.07, 12.56],
  },
  male: {
    'inactive': [753.07, -10.83, 6.50, 14.10],
    'low-active': [581.47, -10.83, 8.30, 14.94],
    'active': [1004.82, -10.83, 6.52, 15.91],
    'very-active': [-517.88, -10.83, 15.61, 19.11],
  },
} as const;

function estimate(profile: Profile, date: string): number | null {
  const { birthDate, sex, heightCm, weightKg, activity } = profile;
  if (!birthDate || !sex || heightCm === undefined || weightKg === undefined || !activity) return null;

  const fullYears = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  const age = fullYears - Number(date.slice(5) < birthDate.slice(5));
  if (age < 19) return null;

  const [constant, ageFactor, heightFactor, weightFactor] = coefficients[sex][activity];
  const kcal = constant + ageFactor * age + heightFactor * heightCm + weightFactor * weightKg;
  return Number.isFinite(kcal) && kcal > 0 ? kcal : null;
}

export function summarize(repo: TrackerRepository, date: string): DailySummary {
  const diet = queryEntries(repo, { date });
  const maintenanceKcal = estimate(repo.profileOn(date)?.profile ?? {}, date);
  return {
    ...diet,
    maintenanceKcal,
    differenceKcal: maintenanceKcal === null ? null : Number((maintenanceKcal - diet.totalKcal).toFixed(9)),
  };
}
