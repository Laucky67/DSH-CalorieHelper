import { useEffect, useRef, useState } from 'react';
import type { ClientInput } from '../core/contracts.ts';
import { request, RequestError } from './api.ts';
import type { ClientResult, MutationAction } from './api.ts';

function message(error: unknown): string {
  return error instanceof RequestError ? error.message : '操作未完成，请重试。';
}

export function useResource<Data>(load: (signal: AbortSignal) => Promise<Data>, poll = 0, active = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ load: typeof load; data?: Data; error?: string; errorCode?: string }>();

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
          setState((previous) => ({
            load, data: previous?.load === load ? previous.data : undefined, error: message(error),
            errorCode: error instanceof RequestError ? error.code : undefined,
          }));
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
  return { data: current?.data, error: current?.error, errorCode: current?.errorCode, refresh: () => setAttempt((value) => value + 1) };
}

export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

function operationId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const pendingOperations = new Map<string, string>();

async function pendingOperation(intent: string) {
  const digest = await crypto.subtle?.digest('SHA-256', new TextEncoder().encode(intent));
  const key = digest ? `calorie-helper:pending:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}` : intent;
  let id = pendingOperations.get(key);
  if (digest) {
    try { id ??= localStorage.getItem(key) ?? undefined; }
    catch { /* In-memory recovery remains available when storage is blocked. */ }
  }
  id ??= operationId();
  pendingOperations.set(key, id);
  if (digest) {
    try { localStorage.setItem(key, id); }
    catch { /* In-memory recovery remains available when storage is blocked. */ }
  }
  return { id, clear() {
    if (pendingOperations.get(key) === id) pendingOperations.delete(key);
    if (digest) {
      try { if (localStorage.getItem(key) === id) localStorage.removeItem(key); }
      catch { /* Storage can be unavailable for this origin. */ }
    }
  } };
}

export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code?: string }>();
  const inFlight = useRef(false);

  async function run<Action extends MutationAction>(
    action: Action,
    input: ClientInput<Action>,
    onSaved?: (result: ClientResult<Action>) => void,
  ): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    let operation: Awaited<ReturnType<typeof pendingOperation>> | undefined;
    let result: ClientResult<Action>;
    try {
      operation = await pendingOperation(JSON.stringify([action, input]));
      result = await request<Action>(action, { ...input, operationId: operation.id });
      operation.clear();
    } catch (failure) {
      if (failure instanceof RequestError && !['CONNECTION', 'STORAGE_FAILURE', 'INVALID_RESPONSE', 'BUSY'].includes(failure.code)) operation?.clear();
      setError({ text: message(failure), code: failure instanceof RequestError ? failure.code : undefined });
      return;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    onSaved?.(result);
  }

  return { busy, error: error?.text, errorCode: error?.code, run, clearError: () => setError(undefined) };
}
