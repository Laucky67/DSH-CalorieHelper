import { z } from 'zod';
import { dateSchema, entrySchema, foodSchema, profileSchema } from './contracts.ts';
import type { DietEntry, Food, ProfileVersion } from './contracts.ts';

export type TrackerState = { foods: Food[]; entries: DietEntry[]; profiles: ProfileVersion[] };

export const trackerStateSchema = z.strictObject({
  foods: z.array(foodSchema.extend({ id: z.string().min(1) })),
  entries: z.array(entrySchema.extend({ id: z.string().min(1) })),
  profiles: z.array(z.strictObject({ effectiveDate: dateSchema, profile: profileSchema })),
});

export interface TrackerStorage {
  load(): Promise<TrackerState | undefined>;
  save(state: TrackerState): Promise<void>;
}

export function openState(storage: TrackerStorage) {
  const loaded = storage.load().then((state): TrackerState => state ?? { foods: [], entries: [], profiles: [] });
  let pending = loaded;

  return {
    async read<Result>(query: (state: TrackerState) => Result): Promise<Result> {
      return structuredClone(query(await pending));
    },
    write<Result>(change: (state: TrackerState) => Result): Promise<Result> {
      const previous = pending;
      const committed = previous.then(async (state) => {
        const next = structuredClone(state);
        const result = change(next);
        await storage.save(next);
        return { next, result };
      });
      pending = committed.then(({ next }) => next, () => previous);
      return committed.then(({ result }) => structuredClone(result));
    },
  };
}
