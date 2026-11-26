import { randomUUID } from 'node:crypto';
import type { DietEntry, DietItem, DietResult, Food, ToolInput } from './contracts.ts';
import { checkExpected, unchanged } from './changes.ts';
import { TrackerError } from './errors.ts';
import { addFood, requireFood } from './foods.ts';
import { nutritionFor } from './nutrition.ts';
import type { TrackerRepository } from './repository.ts';

function requireEntry(repo: TrackerRepository, id: string): DietEntry {
  const entry = repo.entry(id);
  if (!entry) throw new TrackerError('找不到这条饮食记录。', undefined, 'NOT_FOUND');
  return entry;
}

function describeEntry(entry: DietEntry, food: Food): DietItem {
  return { ...entry, foodName: food.name, nutrition: nutritionFor(food, entry.amount) };
}

export function addEntries(repo: TrackerRepository, { date, meal, items }: ToolInput<'diet_create'>): DietItem[] {
  return items.map((item, index) => {
    try {
      const food = 'foodId' in item ? requireFood(repo, item.foodId) : addFood(repo, item.newFood);
      const entry = { id: randomUUID(), date, meal, foodId: food.id, amount: item.amount };
      const result = describeEntry(entry, food);
      repo.insertEntry(entry);
      return result;
    } catch (error) {
      if (error instanceof TrackerError) throw new TrackerError(error.detail, index + 1, error.code);
      throw error;
    }
  });
}

export function queryEntries(repo: TrackerRepository, query: ToolInput<'diet_query'>, limit?: number): DietResult {
  const entries = repo.entries(query).map(({ entry, food }) => describeEntry(entry, food));
  const totalKcal = entries.reduce((total, item) => total + item.nutrition.energyKcal, 0);
  if (!Number.isFinite(totalKcal)) throw new TrackerError('总热量超出范围，请检查这天的食物热量和食用量。');
  const offset = 'date' in query ? query.offset ?? 0 : 0;
  const pageSize = 'date' in query ? query.limit ?? limit : limit;
  const items = pageSize === undefined ? entries : entries.slice(offset, offset + pageSize);
  return { items, totalKcal };
}

export function editEntry(repo: TrackerRepository, { id, changes, expected }: ToolInput<'diet_update'>): DietItem {
  const original = requireEntry(repo, id);
  checkExpected(original, expected, '这条饮食记录已被修改。请先查看最新记录，再保存你的改动。');
  const updated = { ...original, ...changes };
  const result = describeEntry(updated, requireFood(repo, updated.foodId));
  if (!unchanged(original, updated)) repo.updateEntry(updated);
  return result;
}

export function deleteEntry(repo: TrackerRepository, { id, expected }: ToolInput<'diet_delete'>): { id: string } {
  const entry = requireEntry(repo, id);
  checkExpected(entry, expected, '这条记录已被修改。请核对最新记录后再决定是否删除。');
  repo.deleteEntry(id);
  return { id };
}
