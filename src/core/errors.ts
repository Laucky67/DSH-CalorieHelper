import type { ZodType } from 'zod';

export class TrackerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrackerError';
  }
}

export function validated<Value>(schema: ZodType<Value>, input: unknown, message: string): Value {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const itemIndex = issue.path[0] === 'items' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
  const prefix = itemIndex === null ? '' : `第 ${itemIndex + 1} 项：`;
  throw new TrackerError(`${prefix}${message}`);
}
