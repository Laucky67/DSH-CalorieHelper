import { clientResults } from '../core/contracts.ts';
import type { ClientAction, ClientInput } from '../core/contracts.ts';
import type { Tracker } from '../core/tracker.ts';

export type MutationAction = Exclude<ClientAction, 'food_search' | 'diet_query' | 'daily_summary' | 'profile_get'>;
export type ClientResult<Action extends ClientAction> = { [Key in ClientAction]: Awaited<ReturnType<Tracker[Key]>> }[Action];
const reads = new Set<ClientAction>(['food_search', 'diet_query', 'daily_summary', 'profile_get']);

export class RequestError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function request<Action extends ClientAction>(
  action: Action,
  input: ClientInput<Action>,
  signal?: AbortSignal,
  onReceipt?: (id: string) => void,
): Promise<ClientResult<Action>> {
  const read = reads.has(action);
  const timeout = AbortSignal.timeout(read ? 8000 : 15000);
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(new URL('api/calorie-helper', document.baseURI), {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, input }), signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    body = await response.json().catch(() => null);
  } catch {
    throw new RequestError(read ? '连接中断，请重试。' : '暂时无法确认是否已保存。请保留原内容，再点一次保存。', 'CONNECTION');
  }
  if (response.status === 401 || response.status === 403) throw new RequestError('请重新打开 DSH 后重试。', 'AUTH');
  if (!response.ok) {
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && 'code' in body && typeof body.code === 'string') {
      throw new RequestError(body.error, body.code);
    }
    throw new RequestError(read ? '读取失败，请重试。' : '暂时无法确认是否已保存。请保留原内容，再点一次保存。', 'CONNECTION');
  }
  const decoded = clientResults[action].safeParse(body && typeof body === 'object' && 'result' in body ? body.result : undefined);
  if (!decoded.success) {
    throw new RequestError(read ? '无法读取这次结果，请重试。' : '暂时无法确认是否已保存。请保留原内容，再点一次保存。', 'INVALID_RESPONSE');
  }
  if (onReceipt) {
    const receiptId = body && typeof body === 'object' && 'receiptId' in body && body.receiptId;
    if (typeof receiptId !== 'string') throw new RequestError('暂时无法确认是否已保存。请保留原内容，再点一次保存。', 'INVALID_RESPONSE');
    onReceipt(receiptId);
  }
  return decoded.data as ClientResult<Action>;
}
