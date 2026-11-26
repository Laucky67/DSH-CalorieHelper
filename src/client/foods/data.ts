import type { Food } from '../../core/contracts.ts';
import { request } from '../api.ts';

export async function loadFood(id: string, signal?: AbortSignal): Promise<Food | undefined> {
  const [food] = await request('food_search', { id }, signal);
  return food;
}

export function searchFoods(query: string, limit: number, offset: number, signal?: AbortSignal): Promise<Food[]> {
  const text = query.trim().slice(0, 160);
  return request('food_search', { query: text || undefined, limit, offset }, signal);
}
