import { z } from 'zod';
import { activityLevels, meals } from './choices.ts';

const oldText = z.string().trim().min(1);
const visible = (limit: number) => oldText.max(limit).refine((text) => /[^\s\p{Cf}\p{Cc}]/u.test(text));
const name = visible(160);
const unit = visible(24);
const id = z.string().min(1).max(160);
const operationId = z.string().trim().min(1).max(160).optional();
export const amountMin = 0.000001;
export const amountMax = 1_000_000;
export const nutrientMax = 1_000_000;
export const profileMeasureMin = 0.01;
export const heightMax = 300;
export const weightMax = 1000;
const batchMax = 100;
export const dateSchema = z.iso.date();
export const mealSchema = z.enum(meals);
export const trendRanges = ['7', '30', '90', 'all'] as const;
export const trendNutrients = ['proteinG', 'fatG', 'carbsG'] as const;

export const legacyQuantitySchema = z.strictObject({ value: z.number().positive(), unit: oldText });
export const quantitySchema = z.strictObject({ value: z.number().min(amountMin).max(amountMax), unit });
const oldNutritionValuesSchema = z.strictObject({
  energyKcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  calciumMg: z.number().nonnegative().optional(),
});
const nutrient = z.number().nonnegative().max(nutrientMax);
export const nutritionValuesSchema = z.strictObject({
  energyKcal: nutrient,
  proteinG: nutrient.optional(), fatG: nutrient.optional(), carbsG: nutrient.optional(), calciumMg: nutrient.optional(),
});

const nutritionSchema = z.strictObject({ per: quantitySchema, values: nutritionValuesSchema });
const portionSchema = z.strictObject({ unit, equals: quantitySchema });
export const foodSchema = z.strictObject({
  name,
  nutrition: nutritionSchema,
  portions: z.array(portionSchema).max(30).optional(),
});
export const legacyFoodSchema = z.strictObject({
  name: oldText,
  nutrition: z.strictObject({ per: legacyQuantitySchema, values: oldNutritionValuesSchema }),
  portions: z.array(z.strictObject({ unit: oldText, equals: legacyQuantitySchema })).optional(),
});
const foodReference = z.strictObject({ foodId: id, amount: quantitySchema });
const newFoodReference = z.strictObject({ newFood: foodSchema, amount: quantitySchema });
export const entrySchema = z.strictObject({ date: dateSchema, meal: mealSchema, foodId: id, amount: quantitySchema });

export const legacyProfileSchema = z.strictObject({
  birthDate: dateSchema.optional(),
  sex: z.enum(['female', 'male']).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  activity: z.enum(activityLevels).optional(),
});
export const profileSchema = legacyProfileSchema.extend({
  heightCm: z.number().min(profileMeasureMin).max(heightMax).optional(),
  weightKg: z.number().min(profileMeasureMin).max(weightMax).optional(),
});
const timeZone = z.string().refine((zone) => {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; }
  catch { return false; }
}).optional();

const pagination = { limit: z.number().int().min(1).max(200).optional(), offset: z.number().int().min(0).optional() };
const expectedFood = legacyFoodSchema.partial().optional();
const expectedEntry = entrySchema.extend({ amount: legacyQuantitySchema }).partial().optional();
export const toolSchemas = {
  food_search: z.union([z.strictObject({ id }), z.strictObject({ query: name.optional(), ...pagination })]),
  food_create: foodSchema.extend({ operationId }),
  food_update: z.strictObject({ id, changes: foodSchema.partial(), expected: expectedFood, operationId }),
  food_delete: z.strictObject({ id, expected: expectedFood, operationId }),
  diet_create: z.strictObject({
    date: dateSchema,
    meal: mealSchema,
    items: z.array(z.union([foodReference, newFoodReference])).min(1).max(batchMax),
    operationId,
  }),
  diet_query: z.union([z.strictObject({ id }), z.strictObject({ date: dateSchema, meal: mealSchema.optional(), ...pagination })]),
  diet_update: z.strictObject({ id, changes: entrySchema.partial(), expected: expectedEntry, operationId }),
  diet_delete: z.strictObject({ id, expected: expectedEntry, operationId }),
};

export const clientSchemas = {
  ...toolSchemas,
  diet_create: toolSchemas.diet_create.extend({
    previousReceiptId: operationId,
    ifAlreadySaved: z.enum(['use_saved', 'add_another']).optional(),
  }),
  daily_summary: z.strictObject({ date: dateSchema }),
  trends: z.strictObject({ range: z.enum(trendRanges), timeZone }),
  profile_get: z.strictObject({ timeZone }),
  profile_save: profileSchema.extend({ timeZone, expectedVersion: z.number().int().positive().nullable().optional(), operationId }),
};

const storedFood = legacyFoodSchema.extend({ id });
const itemResult = entrySchema.extend({ id, foodName: oldText, amount: legacyQuantitySchema, nutrition: oldNutritionValuesSchema });
const dietResult = z.strictObject({ items: z.array(itemResult), totalKcal: z.number().nonnegative() });
const profileResult = legacyProfileSchema.extend({ version: z.number().int().positive().nullable() });
const trendResult = z.strictObject({
  days: z.array(z.strictObject({
    date: dateSchema, intakeKcal: z.number().nonnegative().nullable(), maintenanceKcal: z.number().positive().nullable(),
  })),
  recordedDays: z.number().int().nonnegative(),
  streak: z.strictObject({ current: z.number().int().nonnegative(), longest: z.number().int().nonnegative() }),
  averages: z.record(z.enum(trendNutrients), z.strictObject({
    grams: z.number().nonnegative().nullable(), days: z.number().int().nonnegative(),
  })),
});
export const clientResults = {
  food_search: z.array(storedFood), food_create: storedFood, food_update: storedFood, food_delete: z.strictObject({ id }),
  diet_create: z.array(itemResult), diet_query: dietResult, diet_update: itemResult, diet_delete: z.strictObject({ id }),
  daily_summary: dietResult.extend({ maintenanceKcal: z.number().nullable(), differenceKcal: z.number().nullable() }),
  trends: trendResult,
  profile_get: profileResult, profile_save: profileResult,
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
export type TrendRange = (typeof trendRanges)[number];
export type Trends = z.infer<typeof trendResult>;
export type ToolName = keyof typeof toolSchemas;
export type ToolInput<Name extends ToolName> = z.infer<(typeof toolSchemas)[Name]>;
export type ClientAction = keyof typeof clientSchemas;
export type ClientInput<Name extends ClientAction> = z.infer<(typeof clientSchemas)[Name]>;
