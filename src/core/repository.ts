import type { DietEntry, Food, Profile, Quantity, ToolInput } from './contracts.ts';

export type StoredProfile = { version: number; profile: Profile };

export interface TrackerRepository {
  read<Result>(query: () => Result): Result;
  write<Result>(change: () => Result): Result;
  receipt(action: string, id: string): { input: string; result: string } | undefined;
  putReceipt(action: string, id: string, input: string, result: string): void;
  food(id: string): Food | undefined;
  foodNamed(name: string): Food | undefined;
  searchFoods(query: string | undefined, limit: number, offset: number): Food[];
  insertFood(food: Food): void;
  updateFood(food: Food): void;
  deleteFood(id: string): void;
  foodInUse(id: string): boolean;
  amountsForFood(id: string): Quantity[];
  entry(id: string): DietEntry | undefined;
  entries(query: ToolInput<'diet_query'>): Array<{ entry: DietEntry; food: Food }>;
  insertEntry(entry: DietEntry): void;
  updateEntry(entry: DietEntry): void;
  deleteEntry(id: string): void;
  profileOn(date: string): StoredProfile | undefined;
  appendProfile(date: string, profile: Profile): number;
}
