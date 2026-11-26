import { randomUUID } from 'node:crypto';
import type { DietEntry, DietItem, DietResult, ToolInput } from './contracts.ts';
import { TrackerError } from './errors.ts';
import { addFood, requireFood } from './foods.ts';
import { nutritionFor } from './nutrition.ts';
import type { TrackerState } from './state.ts';

function requireEntry({ entries }: TrackerState, id: string): DietEntry {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) throw new TrackerError('找不到这条饮食记录。');
  return entry;
}

function describeEntry(state: TrackerState, entry: DietEntry): DietItem {
  const food = requireFood(state, entry.foodId);
  return { ...entry, foodName: food.name, nutrition: nutritionFor(food, entry.amount) };
}

export function addEntries(state: TrackerState, { date, meal, items }: ToolInput<'diet_create'>): DietItem[] {
  return items.map((item, index) => {
    try {
      const food = 'foodId' in item ? requireFood(state, item.foodId) : addFood(state, item.newFood);
      const entry = { id: randomUUID(), date, meal, foodId: food.id, amount: item.amount };
      const result = describeEntry(state, entry);
      state.entries.push(entry);
      return result;
    } catch (error) {
      if (error instanceof TrackerError) throw new TrackerError(`第 ${index + 1} 项：${error.message}`);
      throw error;
    }
  });
}

export function queryEntries(state: TrackerState, query: ToolInput<'diet_query'>): DietResult {
  const items = state.entries.filter((entry) => 'id' in query
    ? entry.id === query.id
    : entry.date === query.date && (query.meal === undefined || entry.meal === query.meal))
    .map((entry) => describeEntry(state, entry));

  return { items, totalKcal: items.reduce((total, item) => total + item.nutrition.energyKcal, 0) };
}

export function editEntry(state: TrackerState, { id, changes }: ToolInput<'diet_update'>): DietItem {
  const original = requireEntry(state, id);
  const updated = { ...original, ...changes };
  const result = describeEntry(state, updated);
  state.entries[state.entries.indexOf(original)] = updated;
  return result;
}

export function deleteEntry(state: TrackerState, id: string): { id: string } {
  const entry = requireEntry(state, id);
  state.entries.splice(state.entries.indexOf(entry), 1);
  return { id };
}
