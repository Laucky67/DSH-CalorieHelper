import { useEffect, useRef, useState } from 'react';
import type { ClientInput } from '../core/contracts.ts';
import { request, RequestError } from './api.ts';
import type { ClientResult, MutationAction } from './api.ts';

function message(error: unknown): string {
  return error instanceof RequestError ? error.message : '操作未完成，请重试。';
}

export function useResource<Data>(load: (signal: AbortSignal) => Promise<Data>, poll = 0, active = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ load: typeof load; data?: Data; error?: string }>();

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let running = false;
    async function reload() {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) setState({ load, data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((previous) => ({ load, data: previous?.load === load ? previous.data : undefined, error: message(error) }));
        }
      } finally { running = false; }
    }
    void reload();
    if (!poll) return () => controller.abort();

    const check = () => { if (document.visibilityState === 'visible') void reload(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = window.setInterval(check, poll);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [active, load, attempt, poll]);

  const current = state?.load === load ? state : undefined;
  return { data: current?.data, error: current?.error, refresh: () => setAttempt((value) => value + 1) };
}

function operationId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const receipts = useRef(new Map<string, string>());

  async function run<Action extends MutationAction>(
    action: Action,
    input: ClientInput<Action>,
    onSaved?: (result: ClientResult<Action>) => void,
  ): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    const intent = JSON.stringify([action, input]);
    const id = receipts.current.get(intent) ?? operationId();
    setBusy(true);
    setError('');
    try {
      const result = await request<Action>(action, { ...input, operationId: id });
      receipts.current.delete(intent);
      onSaved?.(result);
    } catch (failure) {
      if (failure instanceof RequestError && ['CONNECTION', 'STORAGE_FAILURE', 'INVALID_RESPONSE', 'BUSY'].includes(failure.code)) {
        receipts.current.set(intent, id);
      } else {
        receipts.current.delete(intent);
      }
      setError(message(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { busy, error, run, clearError: () => setError('') };
}
