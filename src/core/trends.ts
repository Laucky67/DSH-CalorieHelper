import { shiftDate } from './calendar.ts';
import type { TrendRange, Trends } from './contracts.ts';
import { trendNutrients } from './contracts.ts';
import { nutritionFor } from './nutrition.ts';
import { estimateMaintenance } from './profiles.ts';
import type { TrackerRepository } from './repository.ts';

type Nutrient = (typeof trendNutrients)[number];
type DayIntake = { kcal: number; grams: Record<Nutrient, number | null> };

function countStreaks(dates: string[], today: string): Trends['streak'] {
  let previous = '';
  let length = 0;
  let longest = 0;
  for (const date of dates) {
    length = previous === shiftDate(date, -1) ? length + 1 : 1;
    longest = Math.max(longest, length);
    previous = date;
  }
  const current = previous === today || previous === shiftDate(today, -1) ? length : 0;
  return { current, longest };
}

export function summarizeTrends(repo: TrackerRepository, today: string, range: TrendRange): Trends {
  const recordedDates = repo.recordedDates(today);
  const start = range === 'all' ? recordedDates[0] : shiftDate(today, 1 - Number(range));
  const intake = new Map<string, DayIntake>();
  if (start) {
    for (const { entry, food } of repo.entriesBetween(start, today)) {
      const values = nutritionFor(food, entry.amount);
      const day = intake.get(entry.date) ?? { kcal: 0, grams: { proteinG: 0, fatG: 0, carbsG: 0 } };
      day.kcal += values.energyKcal;
      for (const key of trendNutrients) {
        const total = day.grams[key];
        const grams = values[key];
        day.grams[key] = total === null || grams === undefined ? null : total + grams;
      }
      intake.set(entry.date, day);
    }
  }
  const averages: Trends['averages'] = {
    proteinG: { grams: null, days: 0 }, fatG: { grams: null, days: 0 }, carbsG: { grams: null, days: 0 },
  };
  for (const day of intake.values()) {
    for (const key of trendNutrients) {
      const grams = day.grams[key];
      if (grams === null) continue;
      const result = averages[key];
      result.grams = (result.grams ?? 0) + grams;
      result.days += 1;
    }
  }
  for (const key of trendNutrients) {
    const result = averages[key];
    if (result.grams !== null) result.grams /= result.days;
  }
  const days: Trends['days'] = [];
  if (start) {
    for (let date = start;; date = shiftDate(date, 1)) {
      days.push({
        date, intakeKcal: intake.get(date)?.kcal ?? null,
        maintenanceKcal: estimateMaintenance(repo.profileOn(date)?.profile ?? {}, date),
      });
      if (date === today) break;
    }
  }
  return { days, recordedDays: intake.size, averages, streak: countStreaks(recordedDates, today) };
}
