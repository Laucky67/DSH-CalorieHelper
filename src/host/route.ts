import { z } from 'zod';
import { clientSchemas } from '../core/contracts.ts';
import type { ClientAction } from '../core/contracts.ts';
import type { GetTracker } from '../core/tracker.ts';
import { describeFailure, status } from './failures.ts';

const command = z.strictObject({ action: z.enum(Object.keys(clientSchemas) as ClientAction[]), input: z.unknown() });
const bodyLimit = 1024 * 1024;
const oversized = Symbol('oversized request');

async function readCommand(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > bodyLimit) return oversized;
  const reader = request.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > bodyLimit) return oversized;
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch { return undefined; }
  finally { reader.releaseLock(); }
}

export function createClientRoute(getTracker: GetTracker) {
  return async (request: Request): Promise<Response> => {
    const headers = { 'cache-control': 'no-store' };
    const payload = await readCommand(request);
    if (payload === oversized) return Response.json({ error: '本次提交的内容过多，请分次提交。', code: 'INVALID_INPUT' }, { status: 413, headers });
    const parsed = command.safeParse(payload);
    if (!parsed.success) return Response.json({ error: '请求有误，请刷新后重试。', code: 'INVALID_INPUT' }, { status: 400, headers });

    try {
      const tracker = await getTracker();
      if (parsed.data.action === 'diet_create') {
        const receipt = await tracker.diet_create_from_page(parsed.data.input, request.signal);
        return Response.json(receipt, { headers });
      }
      const result = await tracker[parsed.data.action](parsed.data.input, request.signal);
      return Response.json({ result }, { headers });
    } catch (error) {
      const failure = describeFailure(parsed.data.action, error);
      return Response.json({ error: failure.detail, code: failure.code }, { status: status[failure.code], headers });
    }
  };
}
