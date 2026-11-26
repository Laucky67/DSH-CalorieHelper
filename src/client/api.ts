import type { ClientAction, ClientInput } from '../core/contracts.ts';
import type { Tracker } from '../core/tracker.ts';

export async function request<Action extends ClientAction>(
  action: Action,
  input: ClientInput<Action>,
  signal?: AbortSignal,
): Promise<Awaited<ReturnType<Tracker[Action]>>> {
  const response = await fetch(new URL('api/calorie-helper', document.baseURI), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, input }),
    signal,
  });
  type Result = Awaited<ReturnType<Tracker[Action]>>;
  const body = await response.json().catch(() => null) as { result: Result; error?: never } | { error: string } | null;
  if (!response.ok || !body || !('result' in body)) {
    if (response.status === 401 || response.status === 403) throw new Error('请重新打开 DSH 后重试。');
    throw new Error(body?.error ?? '操作未完成，请重试。');
  }
  return body.result;
}
