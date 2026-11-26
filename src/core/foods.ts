import { randomUUID } from 'node:crypto';
import type { Food, FoodInput, ToolInput } from './contracts.ts';
import { TrackerError } from './errors.ts';
import { nutritionFor, validatePortions } from './nutrition.ts';
import type { TrackerState } from './state.ts';

const plainName = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[\p{P}\s]+/gu, '');
const naturalName = (name: string) => plainName(name).replaceAll('的', '');

function relevance(name: string, query: string): number {
  if (name === query) return 4;
  const plainQuery = plainName(query);
  if (!plainQuery) return 0;
  const plain = plainName(name);
  if (plain === plainQuery) return 3;
  const naturalQuery = naturalName(query);
  if (naturalQuery && naturalName(name) === naturalQuery) return 2;
  return plain.includes(plainQuery) || (naturalQuery && naturalName(name).includes(naturalQuery)) ? 1 : 0;
}

export function searchFoods({ foods }: TrackerState, search: ToolInput<'food_search'>): Food[] {
  if ('id' in search) return foods.filter((food) => food.id === search.id);
  const query = search.query;
  if (!query) return [...foods];

  return foods.map((food) => ({ food, score: relevance(food.name, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ food }) => food);
}

export function requireFood({ foods }: TrackerState, id: string): Food {
  const food = foods.find((candidate) => candidate.id === id);
  if (!food) throw new TrackerError('在食物库中找不到这条食物。');
  return food;
}

function checkFood({ foods }: TrackerState, food: Food): void {
  if (foods.some((candidate) => candidate.id !== food.id && candidate.name === food.name)) {
    throw new TrackerError('食物库里已有同名食物。');
  }
  validatePortions(food);
}

export function addFood(state: TrackerState, data: FoodInput): Food {
  const food = { ...data, id: randomUUID() };
  checkFood(state, food);
  state.foods.push(food);
  return food;
}

export function editFood(state: TrackerState, { id, changes }: ToolInput<'food_update'>): Food {
  const original = requireFood(state, id);
  const food = { ...original, ...changes };
  checkFood(state, food);
  for (const entry of state.entries) {
    if (entry.foodId === id) nutritionFor(food, entry.amount);
  }
  state.foods[state.foods.indexOf(original)] = food;
  return food;
}

export function deleteFood(state: TrackerState, id: string): { id: string } {
  const food = requireFood(state, id);
  if (state.entries.some((entry) => entry.foodId === id)) {
    throw new TrackerError('这条食物已用于饮食记录，无法删除。');
  }
  state.foods.splice(state.foods.indexOf(food), 1);
  return { id };
}
