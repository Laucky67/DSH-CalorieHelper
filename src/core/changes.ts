import { isDeepStrictEqual } from 'node:util';
import { TrackerError } from './errors.ts';

export function checkExpected<T extends object>(current: T, expected: Partial<T> | undefined, detail: string): void {
  if (!expected) return;
  for (const key of Object.keys(expected) as Array<keyof T>) {
    if (!isDeepStrictEqual(current[key], expected[key])) throw new TrackerError(detail, undefined, 'CONFLICT');
  }
}

export { isDeepStrictEqual as unchanged };
