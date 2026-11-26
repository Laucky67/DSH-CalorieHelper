import { z } from 'zod';
import { activityLevels, meals } from './choices.ts';

const text = z.string().trim().min(1);
const id = z.string().min(1);
export const dateSchema = z.iso.date();
export const mealSchema = z.enum(meals);

export const quantitySchema = z.strictObject({ value: z.number().positive(), unit: text });
export const nutritionValuesSchema = z.strictObject({
  energyKcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  calciumMg: z.number().nonnegative().optional(),
});

const nutritionSchema = z.strictObject({ per: quantitySchema, values: nutritionValuesSchema });
const portionSchema = z.strictObject({ unit: text, equals: quantitySchema });
export const foodSchema = z.strictObject({
  name: text,
  nutrition: nutritionSchema,
  portions: z.array(portionSchema).optional(),
});
const foodReference = z.strictObject({ foodId: id, amount: quantitySchema });
const newFoodReference = z.strictObject({ newFood: foodSchema, amount: quantitySchema });
export const entrySchema = z.strictObject({ date: dateSchema, meal: mealSchema, foodId: id, amount: quantitySchema });

export const profileSchema = z.strictObject({
  birthDate: dateSchema.optional(),
  sex: z.enum(['female', 'male']).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  activity: z.enum(activityLevels).optional(),
});
const timeZone = z.string().refine((zone) => {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; }
  catch { return false; }
}).optional();

export const toolSchemas = {
  food_search: z.union([z.strictObject({ id }), z.strictObject({ query: text.optional() })]),
  food_create: foodSchema,
  food_update: z.strictObject({ id, changes: foodSchema.partial() }),
  food_delete: z.strictObject({ id }),
  diet_create: z.strictObject({
    date: dateSchema,
    meal: mealSchema,
    items: z.array(z.union([foodReference, newFoodReference])).min(1),
  }),
  diet_query: z.union([z.strictObject({ id }), z.strictObject({ date: dateSchema, meal: mealSchema.optional() })]),
  diet_update: z.strictObject({ id, changes: entrySchema.partial() }),
  diet_delete: z.strictObject({ id }),
};

export const clientSchemas = {
  ...toolSchemas,
  daily_summary: z.strictObject({ date: dateSchema }),
  profile_get: z.strictObject({ timeZone }),
  profile_save: profileSchema.extend({ timeZone }),
};

export type Meal = z.infer<typeof mealSchema>;
export type Quantity = z.infer<typeof quantitySchema>;
export type NutritionValues = z.infer<typeof nutritionValuesSchema>;
export type FoodInput = z.infer<typeof foodSchema>;
export type Food = FoodInput & { id: string };
export type DietEntry = z.infer<typeof entrySchema> & { id: string };
export type DietItem = DietEntry & { foodName: string; nutrition: NutritionValues };
export type DietResult = { items: DietItem[]; totalKcal: number };
export type Profile = z.infer<typeof profileSchema>;
export type ProfileVersion = { effectiveDate: string; profile: Profile };
export type DailySummary = DietResult & { maintenanceKcal: number | null; differenceKcal: number | null };
export type ToolName = keyof typeof toolSchemas;
export type ToolInput<Name extends ToolName> = z.infer<(typeof toolSchemas)[Name]>;
export type ClientAction = keyof typeof clientSchemas;
export type ClientInput<Name extends ClientAction> = z.infer<(typeof clientSchemas)[Name]>;
