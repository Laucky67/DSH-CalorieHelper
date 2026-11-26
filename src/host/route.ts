import { z } from 'zod';
import { clientSchemas } from '../core/contracts.ts';
import type { GetTracker, Tracker } from '../core/tracker.ts';
import { describeFailure, status } from './failures.ts';

const command = z.strictObject({ action: z.enum(Object.keys(clientSchemas) as [keyof Tracker, ...Array<keyof Tracker>]), input: z.unknown() });

export function createClientRoute(getTracker: GetTracker) {
  return async (request: Request): Promise<Response> => {
    const headers = { 'cache-control': 'no-store' };
    const parsed = command.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return Response.json({ error: '请求有误，请刷新后重试。', code: 'INVALID_INPUT' }, { status: 400, headers });

    try {
      const tracker = await getTracker();
      const result = await tracker[parsed.data.action](parsed.data.input, request.signal);
      return Response.json({ result }, { headers });
    } catch (error) {
      const failure = describeFailure(parsed.data.action, error);
      return Response.json({ error: failure.detail, code: failure.code }, { status: status[failure.code], headers });
    }
  };
}
