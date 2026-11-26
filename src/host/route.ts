import { z } from 'zod';
import { clientSchemas } from '../core/contracts.ts';
import { TrackerError } from '../core/errors.ts';
import type { Tracker } from '../core/tracker.ts';

const command = z.strictObject({ action: z.enum(Object.keys(clientSchemas) as [keyof Tracker, ...Array<keyof Tracker>]), input: z.unknown() });

export function createClientRoute(tracker: Tracker) {
  return async (request: Request): Promise<Response> => {
    const headers = { 'cache-control': 'no-store' };
    const parsed = command.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return Response.json({ error: '请求有误，请刷新后重试。' }, { status: 400, headers });

    try {
      const result = await tracker[parsed.data.action](parsed.data.input);
      return Response.json({ result }, { headers });
    } catch (error) {
      if (error instanceof TrackerError) return Response.json({ error: error.detail }, { status: 400, headers });
      console.error('calorie-helper request failed', error);
      return Response.json({ error: '操作未完成，请重试。' }, { status: 500, headers });
    }
  };
}
