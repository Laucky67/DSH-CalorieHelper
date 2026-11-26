export function fieldChanges<T extends object>(before: T, after: T): { changes: Partial<T>; expected: Partial<T> } {
  const changes: Partial<T> = {};
  const expected: Partial<T> = {};
  for (const key of Object.keys(after) as Array<keyof T>) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = after[key];
      expected[key] = before[key];
    }
  }
  return { changes, expected };
}
