import { randomUUID } from 'node:crypto';
import type { Food, FoodInput, ToolInput } from './contracts.ts';
import { checkExpected, unchanged } from './changes.ts';
import { TrackerError } from './errors.ts';
import { nutritionFor, validatePortions } from './nutrition.ts';
import type { TrackerRepository } from './repository.ts';

export function searchFoods(repo: TrackerRepository, search: ToolInput<'food_search'>): Food[] {
  if ('id' in search) {
    const food = repo.food(search.id);
    return food ? [food] : [];
  }
  return repo.searchFoods(search.query, search.limit ?? 100, search.offset ?? 0);
}

export function requireFood(repo: TrackerRepository, id: string): Food {
  const food = repo.food(id);
  if (!food) throw new TrackerError('在食物库中找不到这条食物。', undefined, 'NOT_FOUND');
  return food;
}

function checkFood(repo: TrackerRepository, food: Food): void {
  const named = repo.foodNamed(food.name);
  if (named && named.id !== food.id) {
    throw new TrackerError('食物库里已有同名食物。', undefined, 'CONFLICT');
  }
  validatePortions(food);
}

export function addFood(repo: TrackerRepository, data: FoodInput): Food {
  const food = { ...data, id: randomUUID() };
  checkFood(repo, food);
  repo.insertFood(food);
  return food;
}

export function editFood(repo: TrackerRepository, { id, changes, expected }: ToolInput<'food_update'>): Food {
  const original = requireFood(repo, id);
  checkExpected({ ...original, portions: original.portions ?? [] }, expected, '这条食物已被修改。请先查看最新资料，再保存你的改动。');
  const food = { ...original, ...changes };
  if (unchanged(original, food)) return original;
  checkFood(repo, food);
  for (const amount of repo.amountsForFood(id)) {
    try { nutritionFor(food, amount); }
    catch (error) {
      if (!(error instanceof TrackerError)) throw error;
      throw new TrackerError(`已有饮食记录使用「${amount.unit}」，请保留能计算热量的计量基准或换算。`);
    }
  }
  repo.updateFood(food);
  return food;
}

export function deleteFood(repo: TrackerRepository, id: string): { id: string } {
  requireFood(repo, id);
  if (repo.foodInUse(id)) {
    throw new TrackerError('这条食物已用于饮食记录，无法删除。', undefined, 'FOOD_IN_USE');
  }
  repo.deleteFood(id);
  return { id };
}
