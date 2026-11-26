import { z } from 'zod';
import { dateSchema, entrySchema, legacyFoodSchema, legacyProfileSchema, legacyQuantitySchema } from '../core/contracts.ts';

export const legacyStateSchema = z.strictObject({
  foods: z.array(legacyFoodSchema.extend({ id: z.string().min(1) })),
  entries: z.array(entrySchema.extend({ id: z.string().min(1), amount: legacyQuantitySchema })),
  profiles: z.array(z.strictObject({ effectiveDate: dateSchema, profile: legacyProfileSchema })),
});

export type LegacyState = z.infer<typeof legacyStateSchema>;
export const emptyLegacyState: LegacyState = { foods: [], entries: [], profiles: [] };
