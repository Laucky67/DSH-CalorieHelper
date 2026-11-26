import { useEffect, useState } from 'react';

function message(error: unknown): string {
  return error instanceof Error && !(error instanceof TypeError) ? error.message : '连接失败，请重试。';
}

export function useResource<Data>(load: (signal: AbortSignal) => Promise<Data>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    load: typeof load;
    attempt: number;
    data?: Data;
    error?: string;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ load, attempt, data }); },
      (error: unknown) => { if (!controller.signal.aborted) setState({ load, attempt, error: message(error) }); },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const current = state?.load === load && state.attempt === attempt ? state : undefined;
  return { data: current?.data, error: current?.error, refresh: () => setAttempt((value) => value + 1) };
}

export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(operation: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError('');
    try { await operation(); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  return { busy, error, run, clearError: () => setError('') };
}
